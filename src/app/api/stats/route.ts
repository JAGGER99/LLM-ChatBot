import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/config";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CorpusStats } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const config = getServerConfig();
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get("datasetId")?.trim() || config.datasetId;

    const { count, error: countError } = await supabase
      .from(config.tableName)
      .select("*", { count: "exact", head: true })
      .contains("metadata", { datasetId });

    if (countError) {
      throw new Error(countError.message);
    }

    const { data, error: rowsError } = await supabase
      .from(config.tableName)
      .select("metadata")
      .contains("metadata", { datasetId })
      .limit(1000);

    if (rowsError) {
      throw new Error(rowsError.message);
    }

    const sources = Array.from(
      new Set(
        (data ?? [])
          .map((row) => String((row.metadata as Record<string, unknown> | null)?.source ?? ""))
          .filter(Boolean),
      ),
    ).slice(0, 8);

    const payload: CorpusStats = {
      totalChunks: count ?? 0,
      sources,
      datasetId,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected stats error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
