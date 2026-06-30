import { NextRequest, NextResponse } from "next/server";
import { WebSearchProvider } from "@/lib/research/websearch";
import { db } from "@/lib/db/client";
import { searchRuns } from "@/lib/db/schema";

const provider = new WebSearchProvider();

export async function POST(req: NextRequest) {
  const { query, filters } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const candidates = await provider.search(query, filters ?? {});

  await db.insert(searchRuns).values({
    query,
    filters: filters ?? {},
    resultCount: candidates.length,
  });

  return NextResponse.json({ candidates });
}
