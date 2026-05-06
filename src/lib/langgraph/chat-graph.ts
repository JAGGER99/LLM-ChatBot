import { ChatOpenAI } from "@langchain/openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { getServerConfig } from "@/lib/config";
import { calculateConfidence, formatContext, retrieveRelevantChunks } from "@/lib/retrieval";
import type { ChatMessage, ChatResponse, RetrievedChunk } from "@/lib/types";

const ChatState = Annotation.Root({
  question: Annotation<string>,
  chatHistory: Annotation<ChatMessage[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  datasetId: Annotation<string>,
  rewrittenQuestion: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  sources: Annotation<RetrievedChunk[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  answer: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  confidence: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
});

function getChatModel() {
  const config = getServerConfig();

  return new ChatOpenAI({
    apiKey: config.openAIApiKey,
    model: config.chatModel,
    temperature: 0.2,
  });
}

function serializeHistory(history: ChatMessage[]) {
  return history
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function readResponseText(content: unknown) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          return typeof item.text === "string" ? item.text : "";
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

async function rewriteQuestionNode(state: typeof ChatState.State) {
  const trimmedQuestion = state.question.trim();
  const history = serializeHistory(state.chatHistory);

  if (!history || trimmedQuestion.length > 160) {
    return { rewrittenQuestion: trimmedQuestion };
  }

  const llm = getChatModel();
  const response = await llm.invoke([
    {
      role: "system",
      content:
        "Rewrite the latest user message into a standalone retrieval query. Keep it concise and preserve proper nouns. Return only the rewritten question.",
    },
    {
      role: "user",
      content: `Conversation:\n${history}\n\nFollow-up question:\n${trimmedQuestion}`,
    },
  ]);

  return {
    rewrittenQuestion: readResponseText(response.content) || trimmedQuestion,
  };
}

async function retrieveContextNode(state: typeof ChatState.State) {
  const rewrittenQuestion = state.rewrittenQuestion || state.question;
  const sources = await retrieveRelevantChunks(rewrittenQuestion, state.datasetId);

  return {
    sources,
    confidence: calculateConfidence(sources),
  };
}

async function answerQuestionNode(state: typeof ChatState.State) {
  if (state.sources.length === 0) {
    return {
      answer:
        "I could not find matching context in the indexed corpus yet. Try ingesting the local corpus first or ask a question that maps more directly to the source material.",
    };
  }

  const llm = getChatModel();
  const context = formatContext(state.sources);
  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are a recruiter-demo RAG assistant. Answer using only the supplied context. Be specific, mention uncertainty when context is incomplete, and cite sources as [S1], [S2], etc.",
    },
    {
      role: "user",
      content: `Question: ${state.question}\n\nRewritten retrieval query: ${state.rewrittenQuestion}\n\nContext:\n${context}`,
    },
  ]);

  return {
    answer: readResponseText(response.content),
  };
}

const chatGraph = new StateGraph(ChatState)
  .addNode("rewrite_question", rewriteQuestionNode)
  .addNode("retrieve_context", retrieveContextNode)
  .addNode("answer_question", answerQuestionNode)
  .addEdge(START, "rewrite_question")
  .addEdge("rewrite_question", "retrieve_context")
  .addEdge("retrieve_context", "answer_question")
  .addEdge("answer_question", END)
  .compile();

export async function runChatGraph(input: {
  question: string;
  chatHistory: ChatMessage[];
  datasetId: string;
}): Promise<ChatResponse> {
  const result = await chatGraph.invoke({
    question: input.question,
    chatHistory: input.chatHistory,
    datasetId: input.datasetId,
  });

  return {
    answer: result.answer,
    rewrittenQuestion: result.rewrittenQuestion || input.question,
    confidence: result.confidence,
    sources: result.sources,
  };
}
