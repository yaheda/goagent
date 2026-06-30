import { scrapeContactInfo } from "./contactScraper";
import { findEmailByDomain, findEmailByName, extractDomain } from "./hunter";

export type EmailSource = "scraped" | "hunter_domain" | "hunter_pattern" | null;
export type EmailConfidence = "high" | "medium" | "low" | null;

export interface EnrichmentResult {
  contactEmail: string | null;
  contactName: string | null;
  contactFormUrl: string | null;
  emailSource: EmailSource;
  emailConfidence: EmailConfidence;
}

export async function runEnrichmentPipeline(
  websiteUrl: string | null,
  existingContactName: string | null
): Promise<EnrichmentResult> {
  const base: EnrichmentResult = {
    contactEmail: null,
    contactName: existingContactName,
    contactFormUrl: null,
    emailSource: null,
    emailConfidence: null,
  };

  if (!websiteUrl) return base;

  // Step 2: Direct scrape via Haiku
  const scraped = await scrapeContactInfo(websiteUrl);

  if (scraped.email) {
    return {
      contactEmail: scraped.email,
      contactName: existingContactName,
      contactFormUrl: scraped.hasForm ? scraped.sourceUrl : null,
      emailSource: "scraped",
      emailConfidence: "high",
    };
  }

  // Capture contact form URL even if no email found from scrape
  const contactFormUrl = scraped.hasForm ? scraped.sourceUrl : null;

  const domain = extractDomain(websiteUrl);
  if (!domain) {
    return { ...base, contactFormUrl };
  }

  // Step 3: Hunter.io Domain Search
  const domainResult = await findEmailByDomain(domain);
  if (domainResult.email) {
    const hunterName = [domainResult.firstName, domainResult.lastName].filter(Boolean).join(" ") || null;
    const name = existingContactName ?? hunterName;
    return {
      contactEmail: domainResult.email,
      contactName: name,
      contactFormUrl,
      emailSource: "hunter_domain",
      emailConfidence: "medium",
    };
  }

  // Step 4: Hunter.io Email Finder (only if we have a contact name to guess from)
  if (existingContactName) {
    const parts = existingContactName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || parts[0];
    const patternResult = await findEmailByName(firstName, lastName, domain);
    if (patternResult.email) {
      return {
        contactEmail: patternResult.email,
        contactName: existingContactName,
        contactFormUrl,
        emailSource: "hunter_pattern",
        emailConfidence: "low",
      };
    }
  }

  // Step 5: No email found — flag contact form or linkedin as fallback
  return { ...base, contactFormUrl };
}
