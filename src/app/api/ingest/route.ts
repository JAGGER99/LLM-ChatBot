import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/config";
import { ingestCorpus } from "@/lib/ingest";

export const runtime = "nodejs";

type IngestRequestBody = {
  datasetId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as IngestRequestBody;
    const config = getServerConfig();

    const result = await ingestCorpus({
      datasetId: body.datasetId?.trim() || config.datasetId,
      corpusDir: config.corpusDir,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected ingestion error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

