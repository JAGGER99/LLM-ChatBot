const DEFAULTS = {
  chatModel: "gpt-4.1-mini",
  embeddingModel: "text-embedding-3-small",
  tableName: "documents",
  matchFunction: "match_documents",
  datasetId: "default-corpus",
  corpusDir: "./data/corpus",
  topK: 6,
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerConfig() {
  return {
    openAIApiKey: requireEnv("OPENAI_API_KEY"),
    chatModel: process.env.OPENAI_CHAT_MODEL ?? DEFAULTS.chatModel,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULTS.embeddingModel,
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    tableName: process.env.SUPABASE_DOCUMENTS_TABLE ?? DEFAULTS.tableName,
    matchFunction: process.env.SUPABASE_MATCH_RPC ?? DEFAULTS.matchFunction,
    datasetId: process.env.CHATBOT_DATASET_ID ?? DEFAULTS.datasetId,
    corpusDir: process.env.CORPUS_DIR ?? DEFAULTS.corpusDir,
    topK: Number(process.env.TOP_K_RESULTS ?? DEFAULTS.topK),
  };
}

