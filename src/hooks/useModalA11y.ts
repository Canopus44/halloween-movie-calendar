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
 *
 * preferredFocusSelector (optional): CSS selector for the control that should
 * receive initial focus (e.g. the search box in a picker modal). Falls back to
 * the first focusable element when the selector matches nothing visible.
 */
export function useModalA11y(open: boolean, onClose: () => void, preferredFocusSelector?: string) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Hold the latest close handler in a ref so parent re-renders (inline arrow
  // props) do not re-run this effect and churn focus.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (panel) {
      const active = document.activeElement as HTMLElement | null;
      // Only capture the trigger when it actually lives outside the panel;
      // re-opening after a same-commit modal swap may leave a detached node
      // focused, which we must not try to restore later.
      if (active && active !== panel && !panel.contains(active)) {
        triggerRef.current = active;
      }
      const focusables = getFocusable(panel);
      const preferred = preferredFocusSelector
        ? panel.querySelector<HTMLElement>(preferredFocusSelector)
        : null;
      const visiblePreferred =
        preferred && (preferred.offsetParent !== null || preferred === document.activeElement)
          ? preferred
          : null;
      (visiblePreferred ?? focusables[0] ?? panel)?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
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
      const trigger = triggerRef.current;
      triggerRef.current = null;
      // Skip restore when the trigger was unmounted (e.g. the DayDetail →
      // MovieModal same-commit transition removed the button that opened us).
      if (trigger && trigger.isConnected) trigger.focus?.();
    };
    // onClose intentionally excluded: consumed through onCloseRef so parent
    // re-renders cannot re-trigger focus capture/restore churn.
  }, [open, preferredFocusSelector]);

  return panelRef;
}
