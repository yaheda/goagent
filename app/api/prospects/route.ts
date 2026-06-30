import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { prospects } from "@/lib/db/schema";
import { findEmailByDomain, extractDomain } from "@/lib/enrichment/hunter";
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

  let contactEmail = body.contactEmail ?? null;
  let contactName = body.contactName ?? null;

  // Enrich with Hunter.io if no email and website is known
  if (!contactEmail && body.websiteUrl) {
    const domain = extractDomain(body.websiteUrl);
    if (domain) {
      const enriched = await findEmailByDomain(domain);
      contactEmail = enriched.email;
      if (!contactName && (enriched.firstName || enriched.lastName)) {
        contactName = [enriched.firstName, enriched.lastName]
          .filter(Boolean)
          .join(" ");
      }
    }
  }

  const [inserted] = await db
    .insert(prospects)
    .values({
      companyName: body.companyName,
      country: body.country ?? null,
      productInterest: body.productInterest ?? [],
      websiteUrl: body.websiteUrl ?? null,
      contactEmail,
      contactName,
      linkedinUrl: body.linkedinUrl ?? null,
      contactFormUrl: body.contactFormUrl ?? null,
      matchScore: body.matchScore ?? null,
      source: body.source ?? "web_search",
      status: "approved",
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
