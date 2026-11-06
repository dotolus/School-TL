# Download Word List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a viewer of an item's "רשימת מילים" (word list) download it as a plain `.txt` file, one word/phrase per line with a trailing comma, for offline dictation practice.

**Architecture:** Pure client-side change, viewer only. The words (`item.detail.words`) are already in the viewer's React state when the item's detail is open, so the download is built entirely in the browser: format the array into text, wrap it in a `Blob`, and render an `<a download>` whose `href` is an object URL for that Blob — the same pattern `useBlobUrl.js` already uses for attachment downloads, applied to generated text instead of a converted `data:` URI. No server route, no admin change.

**Tech Stack:** React (Vite), Vitest + @testing-library/react (existing client test stack).

**Spec:** No separate spec file was written — this is a small change per superpowers:brainstorming's sizing rule. The agreed design (confirmed in conversation):
- Scope: viewer only (`client/src/viewer/ItemDetail.jsx`); no admin, no API.
- Trigger: a download button/link next to "רשימת מילים", shown under the same condition that already gates the word-list (`d.words && d.words.length > 0`).
- File format: one word/phrase per line, each line is the word followed by a trailing comma (including the last line) — e.g. for `["שלום", "עולם"]`:
  ```
  שלום,
  עולם,
  ```
- Encoding: UTF-8 with a BOM prefix, so Hebrew renders correctly in Windows Notepad (same rationale `useBlobUrl.js` documents for Chrome's data-URI quirks — Notepad's auto-detection needs the BOM for UTF-8 text without it).
- Filename: generic `רשימת-מילים.txt` (not item-specific — this is my call, confirmed with the user).
- Styling: reuse the existing `.btn.secondary` class already used for attachment downloads in the same component, for visual consistency.
- Label: must NOT be the existing `"הורדה"` text already used for attachment download links in this same component/test file — collision risk in tests and ambiguity for a sighted user when both a word list and attachments are present on one item. Use `"הורדת רשימת מילים"`.

## Global Constraints

- Viewer only — do not touch `client/src/admin/ItemForm.jsx` or any server file.
- File content: `words.map(w => w + ",").join("\n")` — trailing comma on every line, including the last.
- Blob MIME type: `text/plain;charset=utf-8`.
- Blob content must be prefixed with a UTF-8 BOM (`"﻿"`).
- Download filename: `"רשימת-מילים.txt"`.
- Button label: `"הורדת רשימת מילים"` (must differ from the existing `"הורדה"` attachment-download label).
- Reuse `className="btn secondary"` for the download element.
- The created object URL must be revoked (`URL.revokeObjectURL`) when the component unmounts or when `words` changes, matching the cleanup pattern in `useBlobUrl.js`.

## Review Focus

- `detail.words` absent or empty array: the download link must not render at all (same guard as the existing word-chip list) — covered by an explicit "does not render" test, not just inferred from the chip test.
- A single-word list (`words.length === 1`): the trailing comma is still appended to that one (and only) line — no special-casing to drop the comma when there's nothing after it.
- A word that itself contains a comma or a comma-adjacent character: the output still just appends one trailing comma after it verbatim — no CSV-style escaping, since the spec calls for a simple trailing-comma line format, not an escaped CSV file.
- Hebrew text correctness: the generated Blob's actual bytes must start with the UTF-8 BOM character and contain the words in order with `\n` separators — a test must read the Blob's content back (`await blob.text()`), not just assert the anchor's `href`/`download` attributes.
- Blob URL lifecycle: `URL.revokeObjectURL` must be called with the previously created object URL when the component unmounts (and, if the user navigates between items, when `words` changes) — otherwise every opened item detail leaks an object URL for the lifetime of the page.

---

### Task 1: Word-list download button in the viewer

**Files:**
- Modify: `client/src/viewer/ItemDetail.jsx`
- Test: `client/src/viewer/__tests__/ItemDetail.test.jsx`

**Interfaces:**
- Consumes: `item.detail.words: string[] | undefined` (existing field, already read at `ItemDetail.jsx:70`).
- Produces: nothing consumed by other tasks — this is the only task in this plan.

- [ ] **Step 1: Write the failing tests**

Add to `client/src/viewer/__tests__/ItemDetail.test.jsx`:

```jsx
it("does not render a word-list download link when there are no words", () => {
  render(<ItemDetail item={baseItem({})} />);
  expect(screen.queryByText("הורדת רשימת מילים")).not.toBeInTheDocument();
});

it("renders a word-list download link with the expected filename and label", () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock-url"), revokeObjectURL: vi.fn() });

  render(<ItemDetail item={baseItem({ words: ["שלום", "עולם"] })} />);

  const link = screen.getByText("הורדת רשימת מילים");
  expect(link).toHaveAttribute("href", "blob:mock-url");
  expect(link).toHaveAttribute("download", "רשימת-מילים.txt");
  vi.unstubAllGlobals();
});

it("builds the word-list file as one word per line with a trailing comma, UTF-8 BOM included", async () => {
  let capturedBlob;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    }),
    revokeObjectURL: vi.fn(),
  });

  render(<ItemDetail item={baseItem({ words: ["שלום", "עולם"] })} />);

  const text = await capturedBlob.text();
  expect(text).toBe("﻿שלום,\nעולם,");
  vi.unstubAllGlobals();
});

it("still appends a trailing comma for a single-word list", async () => {
  let capturedBlob;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    }),
    revokeObjectURL: vi.fn(),
  });

  render(<ItemDetail item={baseItem({ words: ["cat"] })} />);

  const text = await capturedBlob.text();
  expect(text).toBe("﻿cat,");
  vi.unstubAllGlobals();
});

it("does not escape a word that itself contains a comma", async () => {
  let capturedBlob;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn((blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    }),
    revokeObjectURL: vi.fn(),
  });

  render(<ItemDetail item={baseItem({ words: ["a, b"] })} />);

  const text = await capturedBlob.text();
  expect(text).toBe("﻿a, b,");
  vi.unstubAllGlobals();
});

it("revokes the word-list object URL on unmount", () => {
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock-url"), revokeObjectURL });

  const { unmount } = render(<ItemDetail item={baseItem({ words: ["cat"] })} />);
  unmount();

  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run client/src/viewer/__tests__/ItemDetail.test.jsx`
Expected: FAIL — `screen.getByText("הורדת רשימת מילים")` not found (element doesn't exist yet).

- [ ] **Step 3: Implement the download link in `client/src/viewer/ItemDetail.jsx`**

Add a pure helper (exported only if useful for the implementer, not required by any test above — the tests exercise it through the component):

```js
function wordsToTextFile(words) {
  return words.map((w) => `${w},`).join("\n");
}
```

Add a small component in the same file, following the `useMemo`/`useEffect` cleanup shape already used by `useBlobUrl.js`:

```jsx
function WordListDownload({ words }) {
  const url = useMemo(() => {
    const bytes = new TextEncoder().encode("﻿" + wordsToTextFile(words));
    return URL.createObjectURL(new Blob([bytes], { type: "text/plain;charset=utf-8" }));
  }, [words]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <a href={url} download="רשימת-מילים.txt" className="btn secondary">
      הורדת רשימת מילים
    </a>
  );
}
```

Import `useMemo`/`useEffect` from `"react"` at the top of the file. Render `<WordListDownload words={d.words} />` inside the existing word-list `<dd>` block (`ItemDetail.jsx:70-81`), alongside the `.word-list` div — exact placement (above/below the chips) is the implementer's call.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run client/src/viewer/__tests__/ItemDetail.test.jsx`
Expected: PASS (all tests in the file, including the pre-existing ones).

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (no regressions elsewhere).

- [ ] **Step 6: Commit**

```bash
git add client/src/viewer/ItemDetail.jsx client/src/viewer/__tests__/ItemDetail.test.jsx
git commit -m "feat: let the viewer download an item's word list as a text file"
```
