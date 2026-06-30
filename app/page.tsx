import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Export Prospect Discovery
      </h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Find importers and buyers for your products using AI-powered research,
        then manage outreach from one place.
      </p>
      <div className="flex gap-4">
        <Link href="/discover" className={cn(buttonVariants({ size: "lg" }))}>
          Start Discovering
        </Link>
        <Link
          href="/prospects"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          View CRM
        </Link>
      </div>
    </main>
  );
}
