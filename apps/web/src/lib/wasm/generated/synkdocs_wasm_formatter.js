// This is a placeholder file. 
// It will be overwritten when you run the wasm-pack build command.
export default async function init() {
    throw new Error("WASM module not built yet. Please run wasm-pack build.");
}
export const format_document = () => { throw new Error("WASM not built"); };
export const get_version = () => "0.0.0-unbuilt";
