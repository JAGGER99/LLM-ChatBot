import { ingestCorpus } from "../lib/ingest";

async function main() {
  const result = await ingestCorpus();
  console.log(
    `Indexed ${result.chunkCount} chunks across ${result.fileCount} files into dataset "${result.datasetId}".`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Ingestion failed.");
  process.exit(1);
});
