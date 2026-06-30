import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { prospects } from "@/lib/db/schema";
import { runEnrichmentPipeline } from "@/lib/enrichment/enrichmentPipeline";
import { desc } from "drizzle-orm";

export async function GET() {
  const all = await db
    .select()
    .from(prospects)
    .orderBy(desc(prospects.createdAt));
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Run the 5-step enrichment pipeline if no email already provided
  let enrichment = {
    contactEmail: body.contactEmail ?? null,
    contactName: body.contactName ?? null,
    contactFormUrl: body.contactFormUrl ?? null,
    emailSource: null as string | null,
    emailConfidence: null as string | null,
  };

  if (!enrichment.contactEmail && body.websiteUrl) {
    const result = await runEnrichmentPipeline(body.websiteUrl, body.contactName ?? null);
    enrichment = {
      contactEmail: result.contactEmail,
      contactName: result.contactName ?? body.contactName ?? null,
      contactFormUrl: result.contactFormUrl ?? body.contactFormUrl ?? null,
      emailSource: result.emailSource,
      emailConfidence: result.emailConfidence,
    };
  }

  const [inserted] = await db
    .insert(prospects)
    .values({
      companyName: body.companyName,
      country: body.country ?? null,
      productInterest: body.productInterest ?? [],
      websiteUrl: body.websiteUrl ?? null,
      contactEmail: enrichment.contactEmail,
      contactName: enrichment.contactName,
      linkedinUrl: body.linkedinUrl ?? null,
      contactFormUrl: enrichment.contactFormUrl,
      matchScore: body.matchScore ?? null,
      source: body.source ?? "web_search",
      status: "approved",
      emailSource: enrichment.emailSource,
      emailConfidence: enrichment.emailConfidence,
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
