"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface DialogProps {
  /** Rendered in the sticky header; should include the dialog's heading. */
  header: ReactNode;
  /** Accessible name when the header has no heading text to reference. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal. Full-screen sheet on phones with a sticky header, centred
 * card on larger screens. Focus moves to the close button on open and back to
 * the opener on close; Tab and Shift+Tab cycle inside; Esc and backdrop close.
 * The rest of the page is made `inert` by the shell while a dialog is open.
 */
export function Dialog({ header, label, onClose, children, footer, testId }: DialogProps) {
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      const el = box.current;
      if (!el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const inside = active instanceof Node && el.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={label}
        tabIndex={-1}
        data-testid={testId}
        className="dialog"
      >
        <div className="dialog-header">
          <div id={titleId} className="min-w-0 flex-1">
            {header}
          </div>
          <button
            ref={closeBtn}
            type="button"
            className="btn btn-secondary btn-hud shrink-0"
            onClick={onClose}
            aria-label="Close"
            data-testid="dialog-close"
          >
            ✕ <span className="kbd ml-1 hidden sm:inline-flex">Esc</span>
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
