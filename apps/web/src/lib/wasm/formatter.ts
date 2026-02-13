// TypeScript helper for loading and interacting with the Rust WASM module.
// This handles the asynchronous nature of WASM loading and provides a clean API.

export interface WasmFormatter {
    format_document: (json: string) => string;
    get_version: () => string;
}

let wasmInstance: WasmFormatter | null = null;
let isLoading = false;

/**
 * Loads the WASM module dynamically.
 */
export async function loadFormatter(): Promise<WasmFormatter> {
    if (wasmInstance) return wasmInstance;
    if (isLoading) {
        // Wait for current loading task to finish
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (wasmInstance) {
                    clearInterval(check);
                    resolve(wasmInstance);
                }
            }, 50);
        });
    }

    isLoading = true;
    try {
        if (typeof window === 'undefined') {
            throw new Error('WASM formatter can only be loaded in the browser');
        }

        // Try to dynamic import the WASM glue code
        // We use a try-catch to provide a fallback if the WASM isn't built yet
        let module;
        try {
            // @ts-ignore
            module = await import('./generated/synkdocs_wasm_formatter.js');
            await module.default();

            wasmInstance = {
                format_document: module.format_document,
                get_version: module.get_version,
            };
            console.log(`✅ WASM Formatter Loaded (v${wasmInstance!.get_version()})`);
        } catch (e) {
            console.warn('⚠️ WASM module not found or failed to load. Using JS fallback.');
            wasmInstance = createFallbackFormatter();
        }

        return wasmInstance!;
    } catch (error) {
        console.error('❌ Critical failure in formatter loader:', error);
        return createFallbackFormatter();
    } finally {
        isLoading = false;
    }
}

/**
 * Fallback JS implementation if WASM is not available
 */
function createFallbackFormatter(): WasmFormatter {
    const processNodes = (nodes: any[]): any[] => {
        return nodes.map(node => {
            const newNode = { ...node };

            // 1. Text Normalization (only collapse multiple spaces)
            if (newNode.type === 'text' && newNode.text) {
                // Only collapse 2+ concurrent spaces into 1 space
                // This preserves tabs, single spaces, and any other non-space whitespace
                newNode.text = newNode.text.replace(/  +/g, ' ');
            }

            // 2. Recursive processing
            if (newNode.content) {
                newNode.content = processNodes(newNode.content);
            }

            return newNode;
        });
    };

    return {
        get_version: () => "0.0.0-fallback",
        format_document: (json: string) => {
            try {
                const doc = JSON.parse(json);
                if (doc.content) {
                    doc.content = processNodes(doc.content);
                }
                return JSON.stringify(doc);
            } catch (e) {
                return json;
            }
        }
    };
}

/**
 * High-level helper to format a JSON object
 */
export async function formatJsonDocument(docJson: any): Promise<any> {
    const formatter = await loadFormatter();
    const jsonString = JSON.stringify(docJson);
    const formattedString = formatter.format_document(jsonString);
    return JSON.parse(formattedString);
}
