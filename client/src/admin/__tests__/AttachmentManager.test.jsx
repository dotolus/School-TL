/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AttachmentManager } from "../AttachmentManager";
import { api } from "../../api";

vi.mock("../../api", () => ({
  api: { uploadItemAttachment: vi.fn(), deleteItemAttachment: vi.fn() },
}));

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
    api.uploadItemAttachment.mockResolvedValue({
      detail: { attachments: [{ id: "a1", url: "/uploads/notes.txt", filename: "notes.txt", kind: "text" }] },
    });

    render(<AttachmentManager itemId="item-1" initialAttachments={[]} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));

    await waitFor(() => expect(api.uploadItemAttachment).toHaveBeenCalledWith("item-1", file));
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeInTheDocument());
  });

  it("deletes an attachment and re-syncs the list from the response", async () => {
    api.deleteItemAttachment.mockResolvedValue({ detail: { attachments: [] } });

    render(
      <AttachmentManager
        itemId="item-1"
        initialAttachments={[{ id: "a1", url: "/uploads/a.pdf", filename: "a.pdf", kind: "pdf" }]}
      />
    );
    fireEvent.click(screen.getByText("✕"));

    await waitFor(() => expect(api.deleteItemAttachment).toHaveBeenCalledWith("item-1", "a1"));
    await waitFor(() => expect(screen.queryByText("a.pdf")).not.toBeInTheDocument());
  });

  it("shows an error if upload fails", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    api.uploadItemAttachment.mockRejectedValue(new Error("Upload failed"));

    render(<AttachmentManager itemId="item-1" initialAttachments={[]} />);
    fireEvent.change(fileInput(), { target: { files: [file] } });
    fireEvent.click(screen.getByText("העלאה"));

    await waitFor(() => expect(screen.getByText("Upload failed")).toBeInTheDocument());
  });
});
