import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import apinator from "@/lib/apinator";

// POST: mark all messages from the other user as read in a conversation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;
  const { conversationId } = await req.json();

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  // Mark all unread messages from the OTHER user as read
  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      isRead: false,
    },
    data: { isRead: true },
  });

  if (result.count > 0) {
    // Find the other participant(s) in this conversation
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: currentUserId } },
      select: { userId: true },
    });

    try {
      // Notify on the chat channel (for check marks in chat area)
      await apinator.trigger({
        name: "messages-read",
        channel: `private-chat-${conversationId}`,
        data: JSON.stringify({
          conversationId,
          readBy: currentUserId,
        }),
      });

      // Notify each sender's personal channel (to clear notification badge)
      for (const p of otherParticipants) {
        await apinator.trigger({
          name: "notifications-read",
          channel: `private-user-${p.userId}`,
          data: JSON.stringify({ conversationId }),
        });
      }
    } catch (err) {
      console.error("[apinator] messages-read trigger failed:", err);
    }
  }

  return NextResponse.json({ marked: result.count });
}
