import { streamText, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system:
      "You are a helpful AI assistant. Be concise and friendly. Use markdown for formatting when appropriate.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
