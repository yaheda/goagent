import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { prospects, outreachLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OutreachPanel } from "./outreach-panel";

export const dynamic = "force-dynamic";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, id))
    .limit(1);

  if (!prospect) notFound();

  const drafts = await db
    .select()
    .from(outreachLog)
    .where(eq(outreachLog.prospectId, id))
    .orderBy(desc(outreachLog.createdAt));

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div>
        <Link
          href="/prospects"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to CRM
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {prospect.companyName}
        </h1>
        <p className="text-muted-foreground mt-1">{prospect.country ?? "Unknown country"}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-muted-foreground font-medium">Products</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(prospect.productInterest ?? []).map((p) => (
              <Badge key={p} variant="secondary">
                {p.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground font-medium">Status</p>
          <Badge className="mt-1">{prospect.status}</Badge>
        </div>
        {prospect.contactEmail && (
          <div>
            <p className="text-muted-foreground font-medium">Email</p>
            <p>{prospect.contactEmail}</p>
          </div>
        )}
        {prospect.contactName && (
          <div>
            <p className="text-muted-foreground font-medium">Contact</p>
            <p>{prospect.contactName}</p>
          </div>
        )}
        {prospect.websiteUrl && (
          <div>
            <p className="text-muted-foreground font-medium">Website</p>
            <a
              href={prospect.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline truncate block"
            >
              {prospect.websiteUrl}
            </a>
          </div>
        )}
        {prospect.linkedinUrl && (
          <div>
            <p className="text-muted-foreground font-medium">LinkedIn</p>
            <a
              href={prospect.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline truncate block"
            >
              {prospect.linkedinUrl}
            </a>
          </div>
        )}
        {prospect.matchScore != null && (
          <div>
            <p className="text-muted-foreground font-medium">Match score</p>
            <p>{prospect.matchScore} / 100</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground font-medium">Source</p>
          <p>{prospect.source ?? "—"}</p>
        </div>
      </div>

      <Separator />

      <OutreachPanel prospectId={prospect.id} initialDrafts={drafts} />
    </main>
  );
}
