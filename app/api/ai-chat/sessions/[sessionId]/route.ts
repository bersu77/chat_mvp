import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const aiSession = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!aiSession || aiSession.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(aiSession);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;
  const { title } = await req.json();

  const aiSession = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!aiSession || aiSession.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  const updated = await prisma.aiChatSession.update({
    where: { id: sessionId },
    data: { title },
    select: { id: true, title: true },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { sessionId } = await params;

  const aiSession = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!aiSession || aiSession.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  await prisma.aiChatSession.delete({ where: { id: sessionId } });

  return new Response(null, { status: 204 });
}
