/** Shared types mirroring the agent service schemas and DB rows. */

export type PersonalizationLevel = "low" | "medium" | "high";

export type VerificationStatus = "unverified" | "valid" | "risky" | "invalid";

export interface EducationItem {
  institution?: string | null;
  degree?: string | null;
  field?: string | null;
  year?: string | null;
}

export interface ExperienceItem {
  organization?: string | null;
  title?: string | null;
  duration?: string | null;
  summary?: string | null;
}

/** Output of the Resume Analyzer (stored as profiles.structured_profile). */
export interface StructuredProfile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  summary?: string | null;
  seniority?: string | null;
  domains: string[];
  skills: string[];
  research_interests: string[];
  notable_work: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  links: string[];
}

/** Canonical recipient schema (DB: recipients). */
export interface Recipient {
  name?: string | null;
  role?: string | null;
  org?: string | null;
  email?: string | null;
  domain_category?: string | null;
  work_summary?: string | null;
  source?: string | null;
  verification_status?: VerificationStatus;
  timezone?: string | null;
}

export interface ProfileRow {
  id: string;
  label: string | null;
  resume_path: string | null;
  structured_profile: StructuredProfile;
  created_at: string;
  updated_at: string;
}

export interface EmailRow {
  id: string;
  recipient_id: string | null;
  profile_id: string | null;
  subject: string;
  body: string;
  personalization_level: PersonalizationLevel;
  model: string | null;
  status: "draft" | "approved";
  created_at: string;
  updated_at: string;
}
