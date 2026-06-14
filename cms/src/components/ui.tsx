import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "brand" | "accent" | "blue" | "danger" | "ghost";

const variantClass: Record<Variant, string> = {
  brand: "rt-btn-brand",
  accent: "rt-btn-accent",
  blue: "rt-btn-blue",
  danger: "rt-btn-danger",
  ghost: "rt-btn-ghost",
};

export function Button({
  variant = "brand",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={`rt-btn ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "brand",
  className = "",
  href,
  prefetch,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  prefetch?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={`rt-btn ${variantClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Panel({
  className = "",
  muted = false,
  children,
}: {
  className?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rt-panel ${muted ? "rt-panel-muted" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`rt-input ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea className={`rt-textarea ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`rt-select ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return <label className={`rt-label ${className}`} {...props} />;
}

export function Badge({
  className = "",
  color = "#fff",
  children,
}: {
  className?: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <span className={`rt-badge ${className}`} style={{ background: color }}>
      {children}
    </span>
  );
}

/** Inline form-state alert used by Server Action forms. */
export function FormMessage({
  message,
}: {
  message?: { type: "error" | "success"; text: string } | null;
}) {
  if (!message) return null;
  const isError = message.type === "error";
  return (
    <div
      role="alert"
      style={{
        padding: "0.6rem 0.9rem",
        borderRadius: "12px",
        border: `1px solid ${isError ? "var(--red)" : "var(--green)"}`,
        background: isError ? "rgba(230,58,82,0.13)" : "rgba(70,224,138,0.13)",
        color: isError ? "#ffb4bd" : "#9ef0c2",
        fontWeight: 700,
        fontSize: "0.9rem",
      }}
    >
      {message.text}
    </div>
  );
}
