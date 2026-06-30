import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  country: text("country"),
  productInterest: text("product_interest").array(),
  websiteUrl: text("website_url"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  linkedinUrl: text("linkedin_url"),
  contactFormUrl: text("contact_form_url"),
  matchScore: integer("match_score"),
  source: text("source"),
  status: text("status").notNull().default("discovered"),
  emailSource: text("email_source"),
  emailConfidence: text("email_confidence"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const outreachLog = pgTable("outreach_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id")
    .notNull()
    .references(() => prospects.id),
  method: text("method").notNull(),
  draftSubject: text("draft_subject"),
  draftBody: text("draft_body").notNull(),
  status: text("status").notNull().default("drafted"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchRuns = pgTable("search_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query").notNull(),
  filters: jsonb("filters"),
  resultCount: integer("result_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Prospect = typeof prospects.$inferSelect;
export type NewProspect = typeof prospects.$inferInsert;
export type OutreachLog = typeof outreachLog.$inferSelect;
export type NewOutreachLog = typeof outreachLog.$inferInsert;
export type SearchRun = typeof searchRuns.$inferSelect;
