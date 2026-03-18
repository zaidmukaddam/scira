'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function NewChatHotkey() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Allow this hotkey even when typing in inputs (it's modifier-only), but keep the helper
      // for future non-modifier shortcuts.
      if (!e.shiftKey) return;

      const isNewChatShortcut =
        // Windows/Linux + sometimes mac (but mac browsers often reserve ⌘⇧O)
        ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) ||
        // mac-friendly fallback: ⌘⇧U (usually not reserved by browsers)
        (e.metaKey && (e.key === 'u' || e.key === 'U'));

      if (!isNewChatShortcut) return;

      e.preventDefault();
      router.push('/new');
    }

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [router]);

  return null;
}

