import Link from "next/link";
import { db } from "@/lib/db/client";
import { prospects } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  approved: "default",
  discovered: "secondary",
  contacted: "outline",
  rejected: "destructive",
};

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const all = await db.select().from(prospects).orderBy(desc(prospects.createdAt));

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
        <p className="text-muted-foreground mt-1">
          All approved prospects. Click a row to view details and draft outreach.
        </p>
      </div>

      {all.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No prospects yet. Go to{" "}
          <Link href="/discover" className="text-primary underline">
            Discover
          </Link>{" "}
          to find and approve prospects.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link
                      href={`/prospects/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>{p.country ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.productInterest ?? []).map((prod) => (
                        <Badge key={prod} variant="secondary" className="text-xs">
                          {prod.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.contactEmail ? (
                      <span className="text-green-700">✉ Email</span>
                    ) : p.linkedinUrl ? (
                      <span className="text-blue-700">in LinkedIn</span>
                    ) : p.contactFormUrl ? (
                      <span className="text-muted-foreground">Form</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{p.matchScore ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
