"use client";

import { useEffect, useRef } from "react";

// ------------------------------------------------------------------
//  The one behaviour every overlay in the feed shares.
//
//  Lock the page behind it, close on Escape, give focus back to whatever
//  opened it. Three sheets (composer, share, photo) need all three, and
//  three copies of the same effect is three chances to drift.
//
//  The close handler is read from a ref so the effect depends on `open`
//  alone: a composer re-renders on every keystroke, and an effect that
//  re-ran with it would steal focus mid-sentence.
// ------------------------------------------------------------------

export default function useOverlay(open: boolean, onClose: () => void) {
  const latest = useRef(onClose);

  useEffect(() => {
    latest.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.stopPropagation();
      latest.current();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      restoreTo?.focus?.();
    };
  }, [open]);
}
