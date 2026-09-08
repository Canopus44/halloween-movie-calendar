import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * Shared modal accessibility: Esc-to-close, focus trap (Tab cycles within the
 * panel), focus move-in on open, and focus restore to the trigger on close.
 * Returns a ref to attach to the modal panel element.
 */
export function useModalA11y(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (panel) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const focusables = getFocusable(panel);
      (focusables[0] ?? panel)?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panelEl = panelRef.current;
      if (!panelEl) return;
      const focusables = getFocusable(panelEl);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelEl.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelEl.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus?.();
      triggerRef.current = null;
    };
  }, [open, onClose]);

  return panelRef;
}
