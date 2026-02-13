import { useEffect, useRef, useCallback } from 'react';
import { useCollaboration } from '@/components/providers/CollaborationProvider';
import { updateDocument } from '@/lib/api/documents';
import { createVersionSnapshot } from '@/lib/api/versions';
import * as Y from 'yjs';

interface UseAutoSaveOptions {
    documentId: string;
    title: string;
    content?: any; // The content from the editor
    enabled?: boolean;
    saveInterval?: number; // ms
    significantChangesThreshold?: number;
}

export function useAutoSave({
    documentId,
    title,
    content,
    enabled = true,
    saveInterval = 30000, // 30 seconds
    significantChangesThreshold = 50,
}: UseAutoSaveOptions) {
    const { ydoc } = useCollaboration();

    const editCountRef = useRef(0);
    const lastSaveTimeRef = useRef(Date.now());
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Keep track of latest content to save
    const latestContentRef = useRef<any>(content);
    useEffect(() => {
        if (content) {
            latestContentRef.current = content;
        }
    }, [content]);

    // Save function
    const saveToSupabase = useCallback(async (createSnapshot = false) => {
        if (!enabled || isSavingRef.current) return;

        try {
            isSavingRef.current = true;

            // Use the latest content passed from the editor
            const contentToSave = latestContentRef.current || (ydoc ? ydoc.toJSON() : null);

            if (!contentToSave) return;

            // Parse content correctly (if it's a string from Editor)
            const parsedContent = typeof contentToSave === 'string' ? JSON.parse(contentToSave) : contentToSave;

            // Save to Supabase
            await updateDocument(documentId, { content: parsedContent, title });

            console.log('✅ Auto-saved to Supabase');
            lastSaveTimeRef.current = Date.now();
            editCountRef.current = 0;

            if (createSnapshot) {
                await createVersionSnapshot(documentId, title, parsedContent, `Auto-save snapshot`);
            }
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
        } finally {
            isSavingRef.current = false;
        }
    }, [documentId, title, enabled, ydoc]);

    // Debounced save
    const scheduleSave = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => saveToSupabase(false), saveInterval);
    }, [saveInterval, saveToSupabase]);

    // Listen to document updates (to detect edits)
    useEffect(() => {
        if (!ydoc || !enabled) return;

        const handleUpdate = (update: Uint8Array, origin: any) => {
            // Ignore updates from remote clients
            if (origin !== null && origin !== ydoc) return;

            editCountRef.current++;
            scheduleSave();

            if (editCountRef.current >= significantChangesThreshold) {
                saveToSupabase(true);
            }
        };

        ydoc.on('update', handleUpdate);
        return () => ydoc.off('update', handleUpdate);
    }, [ydoc, enabled, scheduleSave, saveToSupabase, significantChangesThreshold]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (enabled && editCountRef.current > 0) {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                const contentToSave = latestContentRef.current;
                if (contentToSave) {
                    const parsed = typeof contentToSave === 'string' ? JSON.parse(contentToSave) : contentToSave;
                    updateDocument(documentId, { content: parsed, title }).catch(() => { });
                }
            }
        };
    }, [documentId, title, enabled]);

    return {
        save: () => saveToSupabase(true),
        editCount: editCountRef.current,
        lastSaveTime: lastSaveTimeRef.current,
    };
}
