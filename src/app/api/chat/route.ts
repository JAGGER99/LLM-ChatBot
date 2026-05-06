import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/config";
import { runChatGraph } from "@/lib/langgraph/chat-graph";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

type ChatRequestBody = {
  message?: string;
  history?: ChatMessage[];
  datasetId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "A chat message is required." }, { status: 400 });
    }

    const config = getServerConfig();
    const response = await runChatGraph({
      question: message,
      chatHistory: body.history ?? [],
      datasetId: body.datasetId?.trim() || config.datasetId,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected chat error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

