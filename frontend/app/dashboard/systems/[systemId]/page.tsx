// Placeholder kept only to satisfy Next.js static export.
// Real navigation uses /dashboard/system?id=... (see inventory page).
export function generateStaticParams() {
  return [{ systemId: '_' }];
}

export default function SystemDetailLegacy() {
  return null;
}
