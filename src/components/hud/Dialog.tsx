"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}

/**
 * Accessible modal: labelled, focus moved in on open and restored on close,
 * Tab cycles inside, Esc and backdrop click close it.
 */
export function Dialog({ title, onClose, children, testId }: DialogProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = box.current;
    el?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-bg/60 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid={testId}
        className="panel max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 outline-none sm:rounded-b-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">{children}</div>
          <button type="button" className="btn btn-ghost -mr-2 -mt-2 h-10 min-h-0 px-3" onClick={onClose} aria-label="Close">
            ✕ <span className="kbd ml-1">Esc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
