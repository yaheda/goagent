import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { outreachLog, prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { logId } = await req.json();

  const [log] = await db
    .select()
    .from(outreachLog)
    .where(eq(outreachLog.id, logId))
    .limit(1);

  if (!log) {
    return NextResponse.json({ error: "Outreach log not found" }, { status: 404 });
  }

  // Phase 2: wire Gmail MCP here to actually send
  const [updatedLog] = await db
    .update(outreachLog)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(outreachLog.id, logId))
    .returning();

  await db
    .update(prospects)
    .set({ status: "contacted", updatedAt: new Date() })
    .where(eq(prospects.id, log.prospectId));

  return NextResponse.json(updatedLog);
}
