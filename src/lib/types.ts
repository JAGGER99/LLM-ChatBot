export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type RetrievedChunk = {
  id: number;
  chunkId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type ChatResponse = {
  answer: string;
  rewrittenQuestion: string;
  confidence: number;
  sources: RetrievedChunk[];
};

export type CorpusStats = {
  totalChunks: number;
  sources: string[];
  datasetId: string;
};

