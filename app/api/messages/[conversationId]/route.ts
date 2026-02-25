import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET: fetch messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;
  const { conversationId } = await params;

  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUserId,
        conversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      content: true,
      type: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      isEdited: true,
      isDeleted: true,
      isForwarded: true,
      isRead: true,
      replyToId: true,
      createdAt: true,
      senderId: true,
      sender: { select: { name: true, image: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { name: true } },
        },
      },
      reactions: {
        select: {
          emoji: true,
          userId: true,
        },
      },
    },
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      isEdited: m.isEdited,
      isDeleted: m.isDeleted,
      isForwarded: m.isForwarded,
      isRead: m.isRead,
      replyToId: m.replyToId,
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            senderId: m.replyTo.senderId,
            senderName: m.replyTo.sender.name,
          }
        : null,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      senderName: m.sender.name,
      senderImage: m.sender.image,
      reactions: groupReactions(m.reactions),
    }))
  );
}

function groupReactions(
  reactions: Array<{ emoji: string; userId: string }>
): Array<{ emoji: string; count: number; userIds: string[] }> {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const arr = map.get(r.emoji) ?? [];
    arr.push(r.userId);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}
