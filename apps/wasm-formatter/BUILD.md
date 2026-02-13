# Build Instructions for WASM Formatter

## Prerequisites
1.  **Rust**: [Install Rust](https://rustup.rs/)
2.  **wasm-pack**: [Install wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

## Build Command
Run this command from the `apps/wasm-formatter` directory to compile for the web:

```bash
wasm-pack build --target web --out-dir ../web/src/lib/wasm/generated
```

This will:
-   Compile the Rust code to WebAssembly.
-   Generate JavaScript glue code.
-   Output the files into `apps/web/src/lib/wasm/generated`.

## Next.js Usage
The files in `public/wasm` are accessible via URL, allowing the frontend to fetch and initialize the module.
