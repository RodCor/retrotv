// Public-site layout: wraps every player-facing page in the bright 2015-Habbo
// theme (scoped to .habbo so the admin/CRM keeps its dark, minimal look).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="habbo">{children}</div>;
}
