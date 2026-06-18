// Shared across the careers list + detail pages. Kept out of page.tsx because
// Next.js only allows specific exports (default, metadata, …) from page files.
export const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  REMOTE: 'Remote',
};
