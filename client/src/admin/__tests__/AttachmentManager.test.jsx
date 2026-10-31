/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AttachmentManager } from "../AttachmentManager";

const mockApi = vi.hoisted(() => ({ uploadItemAttachment: vi.fn(), deleteItemAttachment: vi.fn() }));
vi.mock("../../useDatasetApi", () => ({ useDatasetApi: () => mockApi }));

function fileInput() {
  return document.querySelector('input[type="file"]');
}

describe("AttachmentManager", () => {
  it("renders a thumbnail for an image attachment", () => {
    render(
      <AttachmentManager
        itemId="item-1"
        initialAttachments={[{ id: "a1", url: "/uploads/a.png", filename: "a.png", kind: "image" }]}
      />
    );
    expect(document.querySelector(".image-thumb img")).toHaveAttribute("src", "/uploads/a.png");
  });

  it("renders an icon and filename for a non-image attachment", () => {
    render(
      <AttachmentManager
        itemId="item-1"
        initialAttachments={[{ id: "a1", url: "/uploads/a.pdf", filename: "a.pdf", kind: "pdf" }]}
      />
    );
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
  });

  it("uploads a file and re-syncs the list from the response", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    mockApi.uploadItemAttachment.mockResolvedValue({
      detail: { attachments: [{ id: "a1", url: "/uploads/notes.txt", filename: "notes.txt", kind: "text" }] },
    });

    render(<AttachmentManager itemId="item-1" initialAttachments={[]} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));

    await waitFor(() => expect(mockApi.uploadItemAttachment).toHaveBeenCalledWith("item-1", file));
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeInTheDocument());
  });

  it("deletes an attachment and re-syncs the list from the response", async () => {
    mockApi.deleteItemAttachment.mockResolvedValue({ detail: { attachments: [] } });

    render(
      <AttachmentManager
        itemId="item-1"
        initialAttachments={[{ id: "a1", url: "/uploads/a.pdf", filename: "a.pdf", kind: "pdf" }]}
      />
    );
    fireEvent.click(screen.getByText("✕"));

    await waitFor(() => expect(mockApi.deleteItemAttachment).toHaveBeenCalledWith("item-1", "a1"));
    await waitFor(() => expect(screen.queryByText("a.pdf")).not.toBeInTheDocument());
  });

  it("notifies the parent via onChange after an upload", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const next = [{ id: "a1", url: "/uploads/notes.txt", filename: "notes.txt", kind: "text" }];
    mockApi.uploadItemAttachment.mockResolvedValue({ detail: { attachments: next } });
    const onChange = vi.fn();

    render(<AttachmentManager itemId="item-1" initialAttachments={[]} onChange={onChange} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(next));
  });

  it("notifies the parent via onChange after a delete", async () => {
    mockApi.deleteItemAttachment.mockResolvedValue({ detail: { attachments: [] } });
    const onChange = vi.fn();

    render(
      <AttachmentManager
        itemId="item-1"
        initialAttachments={[{ id: "a1", url: "/uploads/a.pdf", filename: "a.pdf", kind: "pdf" }]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText("✕"));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
  });

  it("shows an error if upload fails", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    mockApi.uploadItemAttachment.mockRejectedValue(new Error("Upload failed"));

    render(<AttachmentManager itemId="item-1" initialAttachments={[]} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));

    await waitFor(() => expect(screen.getByText("Upload failed")).toBeInTheDocument());
  });
});
