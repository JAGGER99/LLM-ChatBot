import { OpenAIEmbeddings } from "@langchain/openai";

import { getServerConfig } from "@/lib/config";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { RetrievedChunk } from "@/lib/types";

type MatchDocumentRow = {
  id: number;
  chunk_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function retrieveRelevantChunks(question: string, datasetId?: string) {
  const config = getServerConfig();
  const embeddings = new OpenAIEmbeddings({
    apiKey: config.openAIApiKey,
    model: config.embeddingModel,
  });
  const supabase = getSupabaseAdminClient();
  const queryEmbedding = await embeddings.embedQuery(question);

  const { data, error } = await supabase.rpc(config.matchFunction, {
    query_embedding: queryEmbedding,
    match_count: config.topK,
    metadata_filter: {
      datasetId: datasetId ?? config.datasetId,
    },
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return ((data ?? []) as MatchDocumentRow[]).map<RetrievedChunk>((row) => ({
    id: row.id,
    chunkId: row.chunk_id,
    content: row.content,
    metadata: row.metadata ?? {},
    similarity: row.similarity,
  }));
}

export function formatContext(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => {
      const source = String(chunk.metadata.source ?? "unknown-source");
      return `Source ${index + 1} (${source}, similarity ${chunk.similarity.toFixed(3)}):\n${chunk.content}`;
    })
    .join("\n\n");
}

export function calculateConfidence(chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return 0;
  }

  const topChunks = chunks.slice(0, 3);
  const average = topChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / topChunks.length;
  return Number(average.toFixed(3));
}

