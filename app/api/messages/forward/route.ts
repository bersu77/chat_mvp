import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import apinator from "@/lib/apinator";

// POST: forward a message to another conversation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as { id: string; name?: string | null };
  const { messageId, targetConversationId } = await req.json();

  if (!messageId || !targetConversationId) {
    return NextResponse.json(
      { error: "messageId and targetConversationId required" },
      { status: 400 }
    );
  }

  // Verify user is a participant of the target conversation
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUser.id,
        conversationId: targetConversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant of target conversation" }, { status: 403 });
  }

  // Get the original message
  const original = await prisma.message.findUnique({ where: { id: messageId } });
  if (!original || original.isDeleted) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Create forwarded message
  const forwarded = await prisma.message.create({
    data: {
      content: original.content,
      type: original.type,
      fileUrl: original.fileUrl,
      fileName: original.fileName,
      fileSize: original.fileSize,
      isForwarded: true,
      senderId: currentUser.id,
      conversationId: targetConversationId,
    },
  });

  await prisma.conversation.update({
    where: { id: targetConversationId },
    data: { updatedAt: new Date() },
  });

  const messagePayload = {
    id: forwarded.id,
    content: forwarded.content,
    type: forwarded.type,
    fileUrl: forwarded.fileUrl,
    fileName: forwarded.fileName,
    fileSize: forwarded.fileSize,
    isEdited: false,
    isDeleted: false,
    isForwarded: true,
    replyToId: null,
    replyTo: null,
    senderId: forwarded.senderId,
    senderName: currentUser.name ?? "Unknown",
    createdAt: forwarded.createdAt.toISOString(),
  };

  try {
    await apinator.trigger({
      name: "new-message",
      channel: `private-chat-${targetConversationId}`,
      data: JSON.stringify(messagePayload),
    });
  } catch (err) {
    console.error("[apinator] forward trigger failed:", err);
  }

  return NextResponse.json(messagePayload);
}
