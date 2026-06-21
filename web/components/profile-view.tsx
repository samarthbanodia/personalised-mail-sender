import { Badge } from "@/components/ui/badge";
import type { StructuredProfile } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
    </div>
  );
}

export function ProfileView({ profile }: { profile: StructuredProfile }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold">{profile.name ?? "Unnamed"}</p>
        {profile.headline && <p className="text-sm text-muted-foreground">{profile.headline}</p>}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {profile.email && <span>{profile.email}</span>}
          {profile.location && <span>{profile.location}</span>}
          {profile.seniority && <span>{profile.seniority}</span>}
        </div>
      </div>

      {profile.summary && <p className="text-sm leading-relaxed">{profile.summary}</p>}

      {profile.skills?.length > 0 && (
        <Section title="Skills">
          <Tags items={profile.skills} />
        </Section>
      )}
      {profile.research_interests?.length > 0 && (
        <Section title="Research interests">
          <Tags items={profile.research_interests} />
        </Section>
      )}
      {profile.domains?.length > 0 && (
        <Section title="Domains">
          <Tags items={profile.domains} />
        </Section>
      )}
      {profile.notable_work?.length > 0 && (
        <Section title="Notable work">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {profile.notable_work.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Section>
      )}
      {profile.experience?.length > 0 && (
        <Section title="Experience">
          <ul className="space-y-1.5 text-sm">
            {profile.experience.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.title}</span>
                {e.organization && <span className="text-muted-foreground"> · {e.organization}</span>}
                {e.duration && <span className="text-muted-foreground"> · {e.duration}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
