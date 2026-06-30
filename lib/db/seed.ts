import { db } from "./client";
import { prospects } from "./schema";

async function seed() {
  await db.insert(prospects).values([
    {
      companyName: "Cocoa Masters GmbH",
      country: "Germany",
      productInterest: ["cocoa_butter", "cocoa_powder"],
      websiteUrl: "https://cocoamasters.de",
      contactEmail: "imports@cocoamasters.de",
      contactName: "Hans Müller",
      matchScore: 87,
      source: "perplexity",
      status: "approved",
    },
    {
      companyName: "Gulf Confections LLC",
      country: "UAE",
      productInterest: ["cocoa_butter"],
      websiteUrl: "https://gulfconfections.ae",
      contactEmail: null,
      contactName: null,
      linkedinUrl: "https://linkedin.com/company/gulf-confections",
      matchScore: 72,
      source: "web_search",
      status: "discovered",
    },
    {
      companyName: "Chocolaterie Durand",
      country: "France",
      productInterest: ["cocoa_powder", "cocoa_butter"],
      websiteUrl: "https://chocolaterie-durand.fr",
      contactEmail: "achats@chocolaterie-durand.fr",
      contactName: "Marie Durand",
      matchScore: 91,
      source: "perplexity",
      status: "approved",
    },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
