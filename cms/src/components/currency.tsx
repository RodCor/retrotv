import type { ReactNode } from "react";

/**
 * Currency chips for the public site. The Nitro client's purse icons are baked
 * into its asset bundle (not individually addressable URLs), so these are crisp
 * SVGs drawn to match each currency's identity in the hotel:
 *   coins (Credits) · duckets · diamonds · pixels
 */
export type CurrencyKind = "coins" | "duckets" | "diamonds" | "pixels";

function CoinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" fill="#f7b733" stroke="#b9760f" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5.4" fill="#ffd877" stroke="#e69a1f" strokeWidth="1" />
      <path d="M8.2 9.4a5 5 0 0 1 4.3-2.1" fill="none" stroke="#fff3cf" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DucketIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" fill="#4ad07f" stroke="#1c9b54" strokeWidth="1.5" />
      <path d="M12 7 16 12 12 17 8 12Z" fill="#eafff1" stroke="#1c9b54" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M5 9 9 4H15L19 9 12 21Z" fill="#5fd9ee" stroke="#1593b4" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 9H19M9 4 12 9 15 4M12 9V21" fill="none" stroke="#dff8ff" strokeWidth="0.9" />
    </svg>
  );
}

function PixelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M12 3 20 7.5V16.5L12 21 4 16.5V7.5Z" fill="#9b7bff" stroke="#5b3fd6" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12 3 20 7.5 12 12 4 7.5Z" fill="#bca7ff" />
      <path d="M12 12V21M12 12 20 7.5M12 12 4 7.5" fill="none" stroke="#5b3fd6" strokeWidth="1" />
    </svg>
  );
}

const META: Record<CurrencyKind, { label: string; icon: ReactNode }> = {
  coins: { label: "Coins", icon: <CoinIcon /> },
  duckets: { label: "Duckets", icon: <DucketIcon /> },
  diamonds: { label: "Diamonds", icon: <DiamondIcon /> },
  pixels: { label: "Pixels", icon: <PixelIcon /> },
};

export function CurrencyTile({ kind, amount }: { kind: CurrencyKind; amount: number }) {
  const m = META[kind];
  return (
    <div className="rt-cur">
      <span className="rt-cur-ic">{m.icon}</span>
      <span className="rt-cur-meta">
        <span className="rt-cur-val">{Number(amount ?? 0).toLocaleString()}</span>
        <span className="rt-cur-lbl">{m.label}</span>
      </span>
    </div>
  );
}
