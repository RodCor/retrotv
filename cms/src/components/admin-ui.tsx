import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Re-export the icons used across the CRM so pages import from one place. */
export {
  LayoutDashboard, Users, ShoppingBag, Shirt, Home, Star, ShieldAlert, Settings2,
  Search, Pencil, Trash2, Eye, EyeOff, Plus, Save, Check, X, Coins, Gem, Diamond,
  Ban, UserX, KeyRound, Crown, Image as ImageIcon, ChevronLeft, ChevronRight,
  Circle, Sparkles, Megaphone, ToggleLeft, RefreshCw, Hammer, Music, Camera,
} from "lucide-react";

type BtnVariant = "default" | "primary" | "amber" | "danger" | "solid";
const btnCls: Record<BtnVariant, string> = {
  default: "", primary: "abtn-primary", amber: "abtn-amber", danger: "abtn-danger", solid: "abtn-solid",
};

/** Compact admin button (or link when `href` is set). */
export function ABtn({
  variant = "default", size, href, prefetch, className = "", children, ...rest
}: {
  variant?: BtnVariant; size?: "xs"; href?: string; prefetch?: boolean;
  className?: string; children: ReactNode;
} & ComponentProps<"button">) {
  const cls = `abtn ${btnCls[variant]} ${size === "xs" ? "abtn-xs" : ""} ${className}`;
  if (href) return <Link href={href} prefetch={prefetch} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

type TagColor = "gray" | "green" | "amber" | "cyan" | "red" | "violet";
export function Tag({ color = "gray", className = "", children }: { color?: TagColor; className?: string; children: ReactNode }) {
  return <span className={`tag tag-${color} ${className}`}>{children}</span>;
}

/** Card with an optional header (title + icon + right-side actions). */
export function ACard({
  title, icon, actions, pad = true, className = "", children,
}: { title?: ReactNode; icon?: ReactNode; actions?: ReactNode; pad?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={`acard ${className}`}>
      {title && (
        <div className="acard-head">
          <div className="acard-title">{icon}{title}</div>
          {actions}
        </div>
      )}
      <div className={pad ? "acard-pad" : ""}>{children}</div>
    </section>
  );
}

/** Page heading: eyebrow + title, optional right-side actions. */
export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="aeyebrow">{eyebrow}</p>}
        <h1 className="mt-1">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function Field({ label, className = "", ...props }: { label?: string } & ComponentProps<"input">) {
  return (
    <label className="block">
      {label && <span className="alabel">{label}</span>}
      <input className={`afield ${className}`} {...props} />
    </label>
  );
}
export function Select({ label, className = "", children, ...props }: { label?: string } & ComponentProps<"select">) {
  return (
    <label className="block">
      {label && <span className="alabel">{label}</span>}
      <select className={`afield ${className}`} {...props}>{children}</select>
    </label>
  );
}
export function Textarea({ label, className = "", ...props }: { label?: string } & ComponentProps<"textarea">) {
  return (
    <label className="block">
      {label && <span className="alabel">{label}</span>}
      <textarea className={`afield ${className}`} {...props} />
    </label>
  );
}

/** Stat tile for the dashboard. */
export function StatTile({ icon, label, value, accent = "var(--cyan)" }: { icon: ReactNode; label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="acard acard-pad stat">
      <div className="stat-ic" style={{ color: accent }}>{icon}</div>
      <div>
        <div className="stat-val" style={{ color: accent }}>{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  );
}

/** Inline form-state message (used with useActionState). */
export function FormMsg({ message }: { message?: { type: "error" | "success"; text: string } | null }) {
  if (!message) return null;
  const err = message.type === "error";
  return (
    <p className="mt-2 text-xs font-semibold" style={{ color: err ? "#ff9aa6" : "#7df0aa" }}>
      {message.text}
    </p>
  );
}

/** Wrap a table so it scrolls horizontally instead of overflowing the card. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="dtable-wrap">{children}</div>;
}
