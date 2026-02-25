import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { messages, sessionId } = await req.json();

  // Verify session ownership if sessionId provided
  if (sessionId) {
    const aiSession = await prisma.aiChatSession.findUnique({
      where: { id: sessionId },
    });
    if (!aiSession || aiSession.userId !== userId) {
      return new Response("Invalid session", { status: 403 });
    }
  }

  // The last message is the new user message
  const lastMessage = messages[messages.length - 1];
  const userText =
    lastMessage?.parts
      ?.filter((p: { type: string; text?: string }) => p.type === "text" && p.text)
      .map((p: { text: string }) => p.text)
      .join("") ?? "";

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system:
      "You are a helpful AI assistant. Be concise and friendly. Use markdown for formatting when appropriate.",
    messages: await convertToModelMessages(messages),
    async onFinish({ text }) {
      if (!sessionId) return;

      // Save user message + assistant response
      await prisma.aiChatMessage.createMany({
        data: [
          { role: "user", content: userText, sessionId },
          { role: "assistant", content: text, sessionId },
        ],
      });

      // Auto-generate title from first user message if still default
      const aiSession = await prisma.aiChatSession.findUnique({
        where: { id: sessionId },
      });

      if (aiSession?.title === "New chat" && userText) {
        const title = userText.length > 50 ? userText.slice(0, 50) + "..." : userText;
        await prisma.aiChatSession.update({
          where: { id: sessionId },
          data: { title },
        });
      } else {
        // Touch updatedAt
        await prisma.aiChatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
