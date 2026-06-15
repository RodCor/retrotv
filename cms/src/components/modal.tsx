"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "@/components/admin-ui";

/**
 * Polished admin dialog: dimmed/blurred backdrop, pop-in animation, a coloured
 * icon badge in the header, and an accent edge. Closes on backdrop click, the ✕,
 * or Escape, and locks body scroll while open. Sized so typical forms fit without
 * an inner scrollbar (it only appears as a subtle fallback on short viewports).
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="rt-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`rt-modal rt-modal--${size}`} onClick={(e) => e.stopPropagation()}>
        <header className="rt-modal-head">
          <span className="rt-modal-title">
            {icon && <span className="rt-modal-badge">{icon}</span>}
            <span className="rt-modal-titles">
              <span className="rt-modal-h">{title}</span>
              {subtitle && <span className="rt-modal-sub">{subtitle}</span>}
            </span>
          </span>
          <button type="button" className="rt-modal-x" onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={2.5} />
          </button>
        </header>
        <div className="rt-modal-body">{children}</div>
      </div>
    </div>
  );
}
