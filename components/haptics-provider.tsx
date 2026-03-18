'use client';

import { useEffect } from 'react';
import { useWebHaptics } from 'web-haptics/react';

const INTERACTIVE_SELECTOR =
  [
    '[data-haptic]',
    '[data-sidebar="menu-button"]',
    '[data-sidebar="menu-sub-button"]',
    '[data-slot="sidebar-menu-button"]',
    '[data-slot="sidebar-menu-sub-button"]',
    'button',
    'a[href]',
    'summary',
    '[role="button"]',
    '[role="menuitem"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="option"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    'input[type="checkbox"]',
    'input[type="radio"]',
  ].join(',');

const HAPTIC_TRIGGERS = new Set([
  'success',
  'warning',
  'error',
  'light',
  'medium',
  'heavy',
  'selection',
]);

function resolveHapticTrigger(element: HTMLElement): string {
  const dataTrigger = element.dataset.haptic;
  if (dataTrigger && HAPTIC_TRIGGERS.has(dataTrigger))
    return dataTrigger;

  const role = element.getAttribute('role');
  if (
    role === 'switch' ||
    role === 'tab' ||
    role === 'checkbox' ||
    role === 'radio' ||
    role === 'option' ||
    role === 'menuitemcheckbox' ||
    role === 'menuitemradio'
  )
    return 'selection';

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'a' || tagName === 'summary')
    return 'light';

  if (
    element instanceof HTMLInputElement &&
    (element.type === 'checkbox' || element.type === 'radio')
  )
    return 'selection';

  const variant = element.getAttribute('data-variant');
  if (variant === 'secondary' || variant === 'ghost' || variant === 'link')
    return 'light';

  if (variant === 'destructive')
    return 'warning';

  return 'medium';
}

export function HapticsProvider() {
  const haptics = useWebHaptics();

  useEffect(() => {
    let lastTriggerAt = 0;

    function triggerFromTarget(target: EventTarget | null) {
      if (!(target instanceof Element))
        return;

      const interactiveElement = target.closest(INTERACTIVE_SELECTOR);
      if (!(interactiveElement instanceof HTMLElement))
        return;

      if (interactiveElement.closest('[data-no-haptics]'))
        return;

      const now = Date.now();
      if (now - lastTriggerAt < 250)
        return;
      lastTriggerAt = now;

      haptics.trigger(resolveHapticTrigger(interactiveElement));
    }

    function handlePointerDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0)
        return;

      triggerFromTarget(event.target);
    }

    function handleClick(event: MouseEvent) {
      triggerFromTarget(event.target);
    }

    document.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
      capture: true,
    });
    document.addEventListener('click', handleClick, {
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, {
        capture: true,
      });
      document.removeEventListener('click', handleClick, {
        capture: true,
      });
    };
  }, [haptics]);

  return null;
}
