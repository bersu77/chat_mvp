import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import apinator from "@/lib/apinator";

// POST: send a new message (text or file), optionally as a reply
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as { id: string; name?: string | null };
  const body = await req.json();
  const { conversationId, content, type, fileUrl, fileName, fileSize, replyToId, isForwarded } = body;

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId required" },
      { status: 400 }
    );
  }

  const msgType = type ?? "TEXT";
  if (msgType === "TEXT" && !content?.trim()) {
    return NextResponse.json(
      { error: "content required for text messages" },
      { status: 400 }
    );
  }
  if (msgType !== "TEXT" && !fileUrl) {
    return NextResponse.json(
      { error: "fileUrl required for file messages" },
      { status: 400 }
    );
  }

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUser.id,
        conversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Save message to DB
  const message = await prisma.message.create({
    data: {
      content: content?.trim() ?? fileName ?? "File",
      type: msgType,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      fileSize: fileSize ?? null,
      replyToId: replyToId ?? null,
      isForwarded: isForwarded ?? false,
      senderId: currentUser.id,
      conversationId,
    },
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { name: true } },
        },
      },
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const messagePayload = {
    id: message.id,
    content: message.content,
    type: message.type,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileSize: message.fileSize,
    isEdited: false,
    isDeleted: false,
    isForwarded: message.isForwarded,
    isRead: false,
    replyToId: message.replyToId,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderId: message.replyTo.senderId,
          senderName: message.replyTo.sender.name,
        }
      : null,
    senderId: message.senderId,
    senderName: currentUser.name ?? "Unknown",
    createdAt: message.createdAt.toISOString(),
  };

  // Find the other participant(s) to notify + sender image
  const [participants, senderUser] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: currentUser.id } },
      select: { userId: true },
    }),
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { image: true },
    }),
  ]);

  try {
    // Trigger message on the chat channel
    await apinator.trigger({
      name: "new-message",
      channel: `private-chat-${conversationId}`,
      data: JSON.stringify(messagePayload),
    });

    // Trigger notification on each recipient's personal channel
    for (const p of participants) {
      await apinator.trigger({
        name: "new-notification",
        channel: `private-user-${p.userId}`,
        data: JSON.stringify({
          id: message.id,
          content: message.content,
          type: message.type,
          createdAt: message.createdAt.toISOString(),
          conversationId,
          senderId: currentUser.id,
          senderName: currentUser.name ?? "Unknown",
          senderImage: senderUser?.image ?? null,
        }),
      });
    }
  } catch (err) {
    console.error("[apinator] trigger failed:", err);
  }

  return NextResponse.json(messagePayload);
}

// PATCH: edit a message (own messages, TEXT only)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as { id: string };
  const { messageId, content } = await req.json();

  if (!messageId || !content?.trim()) {
    return NextResponse.json({ error: "messageId and content required" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (message.senderId !== currentUser.id) {
    return NextResponse.json({ error: "Can only edit own messages" }, { status: 403 });
  }
  if (message.type !== "TEXT") {
    return NextResponse.json({ error: "Can only edit text messages" }, { status: 400 });
  }
  if (message.isDeleted) {
    return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: content.trim(), isEdited: true },
  });

  const payload = { id: updated.id, content: updated.content, isEdited: true };

  try {
    await apinator.trigger({
      name: "message-edited",
      channel: `private-chat-${message.conversationId}`,
      data: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[apinator] edit trigger failed:", err);
  }

  return NextResponse.json(payload);
}

// DELETE: soft-delete a message (own messages only)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as { id: string };
  const { messageId } = await req.json();

  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (message.senderId !== currentUser.id) {
    return NextResponse.json({ error: "Can only delete own messages" }, { status: 403 });
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "This message was deleted" },
  });

  const payload = { id: messageId };

  try {
    await apinator.trigger({
      name: "message-deleted",
      channel: `private-chat-${message.conversationId}`,
      data: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[apinator] delete trigger failed:", err);
  }

  return NextResponse.json(payload);
}
