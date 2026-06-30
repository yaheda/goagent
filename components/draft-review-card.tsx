"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { OutreachLog } from "@/lib/db/schema";

interface DraftReviewCardProps {
  log: OutreachLog;
  onSend: (logId: string) => Promise<void>;
}

export function DraftReviewCard({ log, onSend }: DraftReviewCardProps) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await onSend(log.id);
    setSending(false);
  };

  const methodLabel = { email: "Email", linkedin: "LinkedIn", contact_form: "Contact Form" }[log.method] ?? log.method;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{methodLabel}</Badge>
        <Badge variant={log.status === "sent" ? "default" : "secondary"}>
          {log.status}
        </Badge>
      </div>

      {log.draftSubject && (
        <div className="space-y-1">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" defaultValue={log.draftSubject} readOnly={log.status === "sent"} />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          defaultValue={log.draftBody}
          rows={8}
          readOnly={log.status === "sent"}
          className="resize-none"
        />
      </div>

      {log.status !== "sent" && (
        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? "Sending…" : "Mark as Sent"}
        </Button>
      )}

      {log.sentAt && (
        <p className="text-muted-foreground text-xs">
          Sent at {new Date(log.sentAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
