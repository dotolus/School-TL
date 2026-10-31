/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ItemForm } from "../ItemForm";

// ItemForm nests AttachmentManager, which gets its API via useDatasetApi()
// (not a direct "../../api" import) - see client/src/useDatasetApi.js.
const mockApi = vi.hoisted(() => ({ uploadItemAttachment: vi.fn(), deleteItemAttachment: vi.fn() }));
vi.mock("../../useDatasetApi", () => ({ useDatasetApi: () => mockApi }));

const existingItem = {
  id: "item-1",
  type: "notice",
  m: 9,
  y: 2027,
  title: "פריט",
  short: "9.9",
  full: "9.9.2027",
  detail: { attachments: [] },
};

describe("ItemForm", () => {
  it("keeps an attachment uploaded during editing in the submitted payload", async () => {
    const uploaded = [{ id: "a1", url: "/uploads/notes.txt", filename: "notes.txt", kind: "text" }];
    mockApi.uploadItemAttachment.mockResolvedValue({ detail: { attachments: uploaded } });
    const onSubmit = vi.fn().mockResolvedValue();

    render(<ItemForm initial={existingItem} submitLabel="שמירה" onSubmit={onSubmit} />);

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeInTheDocument());

    fireEvent.click(screen.getByText("שמירה"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.detail.attachments).toEqual(uploaded);
  });
});
