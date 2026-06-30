export interface Filters {
  products?: string[];
  regions?: string[];
}

export interface CandidateProspect {
  companyName: string;
  country: string | null;
  productInterest: string[];
  websiteUrl: string | null;
  linkedinUrl: string | null;
  contactFormUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  matchScore: number;
  source: string;
  snippet: string;
}

export interface ResearchProvider {
  search(query: string, filters: Filters): Promise<CandidateProspect[]>;
}
