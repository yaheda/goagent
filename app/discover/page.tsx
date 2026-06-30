"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ProspectCard } from "@/components/prospect-card";
import type { CandidateProspect } from "@/lib/research/provider";

const PRODUCTS = ["cocoa_butter", "cocoa_powder", "cocoa_beans", "chocolate"];
const REGIONS = ["Europe", "Middle East", "Asia", "North America", "Africa"];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateProspect[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setCandidates([]);

    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        filters: { products: selectedProducts, regions: selectedRegions },
      }),
    });

    if (!res.ok) {
      setError("Research failed. Please check your API key and try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setCandidates(data.candidates ?? []);
    setLoading(false);
  };

  const handleApprove = async (candidate: CandidateProspect) => {
    const key = candidate.companyName + candidate.country;
    setApprovingId(key);

    await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candidate),
    });

    setCandidates((prev) => prev.filter((c) => c.companyName + c.country !== key));
    setApprovingId(null);
  };

  const handleReject = (candidate: CandidateProspect) => {
    setCandidates((prev) =>
      prev.filter(
        (c) => c.companyName + c.country !== candidate.companyName + candidate.country
      )
    );
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discover Prospects</h1>
        <p className="text-muted-foreground mt-1">
          Search for importers and buyers using natural language.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <Input
          placeholder='e.g. "cocoa butter importers in the UAE"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="text-base"
        />
        <Button onClick={handleSearch} disabled={loading} className="shrink-0">
          {loading ? "Researching…" : "Search"}
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Products</p>
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map((p) => (
              <Toggle
                key={p}
                pressed={selectedProducts.includes(p)}
                onPressedChange={() =>
                  toggleItem(selectedProducts, setSelectedProducts, p)
                }
                size="sm"
                variant="outline"
              >
                {p.replace(/_/g, " ")}
              </Toggle>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Regions</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <Toggle
                key={r}
                pressed={selectedRegions.includes(r)}
                onPressedChange={() =>
                  toggleItem(selectedRegions, setSelectedRegions, r)
                }
                size="sm"
                variant="outline"
              >
                {r}
              </Toggle>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground">Researching prospects, this may take 10–15 seconds…</p>
        </div>
      )}

      {/* Results grid */}
      {!loading && candidates.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-4 text-sm">
            Found {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c, i) => (
              <ProspectCard
                key={`${c.companyName}-${i}`}
                candidate={c}
                onApprove={handleApprove}
                onReject={handleReject}
                approving={approvingId === c.companyName + c.country}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && candidates.length === 0 && query && !error && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No results yet. Run a search to discover prospects.
        </p>
      )}
    </main>
  );
}
