import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { prospects, outreachLog } from "@/lib/db/schema";
import { draftOutreach } from "@/lib/outreach/draftEmail";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { prospectId } = await req.json();

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, prospectId))
    .limit(1);

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  const draft = await draftOutreach(prospect);

  const [log] = await db
    .insert(outreachLog)
    .values({
      prospectId: prospect.id,
      method: draft.method,
      draftSubject: draft.subject,
      draftBody: draft.body,
      status: "drafted",
    })
    .returning();

  return NextResponse.json(log);
}
