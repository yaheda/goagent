"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DraftReviewCard } from "@/components/draft-review-card";
import type { OutreachLog } from "@/lib/db/schema";

interface OutreachPanelProps {
  prospectId: string;
  initialDrafts: OutreachLog[];
}

export function OutreachPanel({ prospectId, initialDrafts }: OutreachPanelProps) {
  const [drafts, setDrafts] = useState<OutreachLog[]>(initialDrafts);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDraft = async () => {
    setGenerating(true);
    setError(null);

    const res = await fetch("/api/outreach/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId }),
    });

    if (!res.ok) {
      setError("Failed to generate draft. Please check your API key.");
      setGenerating(false);
      return;
    }

    const log: OutreachLog = await res.json();
    setDrafts((prev) => [log, ...prev]);
    setGenerating(false);
  };

  const handleSend = async (logId: string) => {
    const res = await fetch("/api/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
    if (!res.ok) return;
    const updated: OutreachLog = await res.json();
    setDrafts((prev) => prev.map((d) => (d.id === logId ? updated : d)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Outreach</h2>
        <Button onClick={handleDraft} disabled={generating}>
          {generating ? "Generating…" : "Draft outreach"}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {drafts.length === 0 && !generating && (
        <p className="text-muted-foreground text-sm">
          No drafts yet. Click "Draft outreach" to generate one.
        </p>
      )}

      {generating && (
        <div className="flex items-center gap-3">
          <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Generating draft…</p>
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((log) => (
          <DraftReviewCard key={log.id} log={log} onSend={handleSend} />
        ))}
      </div>
    </div>
  );
}
