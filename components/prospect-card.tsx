"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CandidateProspect } from "@/lib/research/provider";

interface ProspectCardProps {
  candidate: CandidateProspect;
  onApprove: (candidate: CandidateProspect) => void;
  onReject: (candidate: CandidateProspect) => void;
  approving?: boolean;
}

export function ProspectCard({
  candidate,
  onApprove,
  onReject,
  approving,
}: ProspectCardProps) {
  const scoreColor =
    candidate.matchScore >= 80
      ? "bg-green-100 text-green-800"
      : candidate.matchScore >= 60
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">
            {candidate.companyName}
          </CardTitle>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor}`}
          >
            {candidate.matchScore}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{candidate.country ?? "Unknown country"}</p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-2">
        <div className="flex flex-wrap gap-1">
          {candidate.productInterest.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs">
              {p.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground line-clamp-3 text-sm">{candidate.snippet}</p>
        {candidate.websiteUrl && (
          <a
            href={candidate.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary block truncate text-xs underline"
          >
            {candidate.websiteUrl}
          </a>
        )}
        <p className="text-muted-foreground text-xs">via {candidate.source}</p>
      </CardContent>
      <CardFooter className="gap-2 pt-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onApprove(candidate)}
          disabled={approving}
        >
          {approving ? "Adding…" : "Approve & Add to CRM"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(candidate)}
          disabled={approving}
        >
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
