"use client";

import { useState } from "react";
import { X, ImageIcon } from "@/components/admin-ui";

/**
 * Small pixel-art thumbnail (furni icon or avatar look) that opens a larger
 * preview on click. Falls back to a neutral placeholder when the image 404s
 * (not every classname/look has a rendered asset).
 */
export function MediaThumb({
  src,
  large,
  alt,
}: {
  src: string;
  large?: string;
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span className="thumb thumb-empty" title={alt}>
        <ImageIcon size={14} strokeWidth={2} />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="thumb"
        onClick={() => setOpen(true)}
        title={`${alt} — click to enlarge`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
      </button>

      {open && (
        <div className="thumb-overlay" role="dialog" aria-modal onClick={() => setOpen(false)}>
          <div className="thumb-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="thumb-x"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb-big" src={large ?? src} alt={alt} />
            <p className="thumb-cap">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
}
