import { OpenAIEmbeddings } from "@langchain/openai";

import { buildCorpusChunks } from "@/lib/corpus";
import { getServerConfig } from "@/lib/config";
import { getSupabaseAdminClient } from "@/lib/supabase";

const UPSERT_BATCH_SIZE = 100;

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function ingestCorpus(options?: { datasetId?: string; corpusDir?: string }) {
  const config = getServerConfig();
  const datasetId = options?.datasetId ?? config.datasetId;
  const corpusDir = options?.corpusDir ?? config.corpusDir;

  const preparedChunks = await buildCorpusChunks(corpusDir, datasetId);
  const embeddings = new OpenAIEmbeddings({
    apiKey: config.openAIApiKey,
    model: config.embeddingModel,
  });
  const supabase = getSupabaseAdminClient();

  const vectors = await embeddings.embedDocuments(preparedChunks.map((chunk) => chunk.content));
  const rows = preparedChunks.map((chunk, index) => ({
    chunk_id: chunk.chunkId,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: vectors[index],
  }));

  for (const batch of chunkArray(rows, UPSERT_BATCH_SIZE)) {
    const { error } = await supabase
      .from(config.tableName)
      .upsert(batch, { onConflict: "chunk_id" });

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  return {
    datasetId,
    corpusDir,
    chunkCount: rows.length,
    fileCount: new Set(rows.map((row) => String(row.metadata.source))).size,
  };
}

