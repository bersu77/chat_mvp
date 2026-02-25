import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET: list conversations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as { id: string }).id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: currentUserId } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: currentUserId },
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== currentUserId
      );
      const lastMessage = conv.messages[0] ?? null;

      return {
        id: conv.id,
        otherUser: otherParticipant?.user ?? null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              type: lastMessage.type,
              fileUrl: lastMessage.fileUrl,
              fileName: lastMessage.fileName,
              createdAt: lastMessage.createdAt.toISOString(),
              senderId: lastMessage.senderId,
              isRead: lastMessage.isRead,
            }
          : null,
        unreadCount: conv._count.messages,
        updatedAt: conv.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/conversations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create or get existing conversation between two users
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;
  const { otherUserId } = await req.json();

  if (!otherUserId) {
    return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: currentUserId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (existing) {
    return NextResponse.json({ id: existing.id, participants: existing.participants.map((p) => p.user) });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: currentUserId }, { userId: otherUserId }],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({
    id: conversation.id,
    participants: conversation.participants.map((p) => p.user),
  });
}
