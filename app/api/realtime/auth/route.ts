import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import apinator from "@/lib/apinator";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  console.log("[auth] session:", session?.user ? `user=${(session.user as { id: string }).id}` : "NO SESSION");

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
  };

  const { socket_id, channel_name } = await req.json();
  console.log("[auth] socket_id:", socket_id, "channel_name:", channel_name);

  if (!socket_id || !channel_name) {
    console.error("[auth] MISSING socket_id or channel_name");
    return NextResponse.json(
      { error: "Missing socket_id or channel_name" },
      { status: 400 }
    );
  }

  if (channel_name.startsWith("presence-")) {
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, name: true, email: true, image: true },
    });

    const channelData = JSON.stringify({
      user_id: currentUser.id,
      user_info: {
        name: user?.name ?? user?.email ?? "Anonymous",
        email: user?.email ?? "",
        image: user?.image ?? null,
      },
    });

    const auth = apinator.authenticateChannel(socket_id, channel_name, channelData);
    console.log("[auth] presence auth response:", JSON.stringify(auth));
    return NextResponse.json(auth);
  }

  // Private user channel (notifications) — user can only subscribe to their own
  if (channel_name.startsWith("private-user-")) {
    const channelUserId = channel_name.replace("private-user-", "");
    if (channelUserId !== currentUser.id) {
      console.error("[auth] user", currentUser.id, "tried to subscribe to", channelUserId, "notification channel");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const auth = apinator.authenticateChannel(socket_id, channel_name);
    console.log("[auth] private-user auth response:", JSON.stringify(auth));
    return NextResponse.json(auth);
  }

  if (channel_name.startsWith("private-chat-")) {
    const conversationId = channel_name.replace("private-chat-", "");

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUser.id,
          conversationId,
        },
      },
    });

    if (!participant) {
      console.error("[auth] user", currentUser.id, "NOT participant of", conversationId);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const auth = apinator.authenticateChannel(socket_id, channel_name);
    console.log("[auth] private-chat auth response:", JSON.stringify(auth));
    return NextResponse.json(auth);
  }

  console.error("[auth] unknown channel type:", channel_name);
  return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
}
