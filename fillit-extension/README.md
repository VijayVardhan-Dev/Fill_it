# FillIt · Sprint 1

FillIt is a local-only click-to-fill browser extension built on WXT, React, TypeScript, and Tailwind CSS.

## Run the extension

From this folder, run `npm run dev` and load WXT's generated development extension in your browser. The content script waits for a user to focus or click an eligible field before it extracts context or shows suggestions. Choosing a suggestion writes through the native DOM value setter and dispatches bubbling `input` and `change` events.

## Stress-test sandbox

WXT builds `entrypoints/sandbox/index.html` as the `sandbox.html` extension page. Open that page from the loaded extension to exercise React controlled fields, a native select, an input-backed custom combobox, a Shadow DOM field, nearby-text matching, and an `about:srcdoc` iframe.

The personas in `core/mockKnowledgeGraph.ts` contain fictional demo values. Sprint 1 has no backend or network calls.
