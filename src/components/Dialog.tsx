import { useEffect, useRef, type ReactNode } from "react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  labelledBy: string;
  /** Omit for decisions that must not be dismissed implicitly (Escape and backdrop do nothing). */
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

/** Modal surface per behavior spec §12.1: named, focus-managed, Escape when safe, focus restored on close. */
export function Dialog({ labelledBy, onClose, className = "", children }: DialogProps) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Read during the first render: a child's autoFocus moves focus into the dialog before effects run.
  const invoker = useRef(document.activeElement);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = invoker.current instanceof HTMLElement ? invoker.current : null;
    const focusables = () => [...node.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => element.getClientRects().length > 0);
    if (!node.contains(document.activeElement)) (focusables()[0] ?? node).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeRef.current) { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => { node.removeEventListener("keydown", onKeyDown); if (previous?.isConnected) previous.focus(); };
  }, []);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current?.(); }}>
      <section ref={ref} className={`dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>{children}</section>
    </div>
  );
}

export function DialogHeader({ id, eyebrow, title, hint, onClose, closeLabel }: { id: string; eyebrow?: string; title: string; hint?: string; onClose?: () => void; closeLabel: string }) {
  return (
    <header className="dialog-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
        {hint && <p>{hint}</p>}
      </div>
      {onClose && <button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}>×</button>}
    </header>
  );
}
