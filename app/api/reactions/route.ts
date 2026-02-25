import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import apinator from "@/lib/apinator";

// POST: toggle a reaction (add or remove)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as { id: string; name?: string | null };
  const { messageId, emoji } = await req.json();

  if (!messageId || !emoji) {
    return NextResponse.json(
      { error: "messageId and emoji required" },
      { status: 400 }
    );
  }

  // Fetch the message and verify the user is a participant
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      userId_conversationId: {
        userId: currentUser.id,
        conversationId: message.conversationId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Toggle: check if reaction already exists
  const existing = await prisma.reaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: currentUser.id,
        emoji,
      },
    },
  });

  let action: "added" | "removed";

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    action = "removed";
  } else {
    await prisma.reaction.create({
      data: { messageId, userId: currentUser.id, emoji },
    });
    action = "added";
  }

  const payload = {
    action,
    messageId,
    emoji,
    userId: currentUser.id,
    userName: currentUser.name ?? "Unknown",
  };

  try {
    await apinator.trigger({
      name: "reaction-updated",
      channel: `private-chat-${message.conversationId}`,
      data: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[apinator] reaction trigger failed:", err);
  }

  return NextResponse.json(payload);
}
