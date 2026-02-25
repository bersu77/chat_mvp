import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET: get recent unread messages across all conversations (for notification bell)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;

  const unreadMessages = await prisma.message.findMany({
    where: {
      conversation: {
        participants: { some: { userId: currentUserId } },
      },
      senderId: { not: currentUserId },
      isRead: false,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      conversationId: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  const totalUnread = await prisma.message.count({
    where: {
      conversation: {
        participants: { some: { userId: currentUserId } },
      },
      senderId: { not: currentUserId },
      isRead: false,
      isDeleted: false,
    },
  });

  return NextResponse.json({
    totalUnread,
    messages: unreadMessages.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt.toISOString(),
      conversationId: m.conversationId,
      senderName: m.sender.name,
      senderImage: m.sender.image,
      senderId: m.sender.id,
    })),
  });
}
