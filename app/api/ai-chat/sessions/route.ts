import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const sessions = await prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return Response.json(sessions);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const newSession = await prisma.aiChatSession.create({
    data: { userId },
    select: { id: true, title: true },
  });

  return Response.json(newSession);
}
