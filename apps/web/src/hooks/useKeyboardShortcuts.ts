'use client';

import { useEffect } from 'react';

export type KeyCombo = {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    alt?: boolean;
    shift?: boolean;
};

export function useKeyboardShortcuts(
    shortcuts: { combo: KeyCombo; action: (e: KeyboardEvent) => void }[]
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            shortcuts.forEach(({ combo, action }) => {
                const isKeyMatch = e.key.toLowerCase() === combo.key.toLowerCase();
                const isCtrlMatch = !!combo.ctrl === e.ctrlKey;
                const isMetaMatch = !!combo.meta === e.metaKey;
                const isAltMatch = !!combo.alt === e.altKey;
                const isShiftMatch = !!combo.shift === e.shiftKey;

                if (isKeyMatch && isCtrlMatch && isMetaMatch && isAltMatch && isShiftMatch) {
                    e.preventDefault();
                    action(e);
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
