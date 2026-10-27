/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ItemDetail } from "../ItemDetail";
import * as AttachmentViewerProvider from "../AttachmentViewerProvider";

function baseItem(detail, overrides = {}) {
  return { full: "Tuesday, 16.3.2027", detail, ...overrides };
}

describe("ItemDetail", () => {
  it("renders detail.generalInfo as free text when present", () => {
    render(<ItemDetail item={baseItem({ generalInfo: "arrive 15 minutes early" })} />);
    expect(screen.getByText("arrive 15 minutes early")).toBeInTheDocument();
  });

  it("does not render a general-info row when detail.generalInfo is absent", () => {
    render(<ItemDetail item={baseItem({})} />);
    expect(screen.queryByText("מידע כללי")).not.toBeInTheDocument();
  });

  it("shows the parent-signature note only when required-parent-signature is true", () => {
    render(<ItemDetail item={baseItem({}, { "required-parent-signature": true })} />);
    expect(screen.getByText("יש להחזיר אישור הורים חתום")).toBeInTheDocument();
  });
  it("renders a real link as a clickable anchor", () => {
    render(<ItemDetail item={baseItem({ links: [{ label: "Site", url: "https://example.com" }] })} />);
    const link = screen.getByRole("link", { name: /Site/ });
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders a placeholder link as plain text, never a clickable anchor", () => {
    render(
      <ItemDetail
        item={baseItem({ links: [{ label: "Form", url: "#", ph: true }] })}
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Form/)).toBeInTheDocument();
  });

  it("renders word chips", () => {
    render(<ItemDetail item={baseItem({ words: ["cat", "dog"] })} />);
    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText("dog")).toBeInTheDocument();
  });

  it("clicking an image thumbnail opens the viewer with its attachment info", () => {
    const open = vi.fn();
    vi.spyOn(AttachmentViewerProvider, "useAttachmentViewer").mockReturnValue({ open });

    render(
      <ItemDetail
        item={baseItem({
          attachments: [{ id: "i1", url: "/uploads/a/b.png", mimeType: "image/png", filename: "b.png", kind: "image" }],
        })}
      />
    );
    fireEvent.click(screen.getByRole("button"));

    expect(open).toHaveBeenCalledWith({ url: "/uploads/a/b.png", mimeType: "image/png", filename: "b.png", kind: "image" });
  });

  it("shows a preview button for a pdf attachment but not for a zip attachment", () => {
    vi.spyOn(AttachmentViewerProvider, "useAttachmentViewer").mockReturnValue({ open: vi.fn() });

    render(
      <ItemDetail
        item={baseItem({
          attachments: [
            { id: "p1", url: "/uploads/a/b.pdf", mimeType: "application/pdf", filename: "b.pdf", kind: "pdf" },
            { id: "z1", url: "/uploads/a/b.zip", mimeType: "application/zip", filename: "b.zip", kind: "zip" },
          ],
        })}
      />
    );

    expect(screen.getByText("תצוגה מקדימה")).toBeInTheDocument();
    expect(screen.getAllByText("תצוגה מקדימה")).toHaveLength(1);
  });

  it("renders a download link for every attachment kind, including zip", () => {
    vi.spyOn(AttachmentViewerProvider, "useAttachmentViewer").mockReturnValue({ open: vi.fn() });

    render(
      <ItemDetail
        item={baseItem({
          attachments: [
            { id: "z1", url: "/uploads/a/b.zip", mimeType: "application/zip", filename: "b.zip", kind: "zip" },
          ],
        })}
      />
    );

    const link = screen.getByText("הורדה");
    expect(link).toHaveAttribute("href", "/uploads/a/b.zip");
    expect(link).toHaveAttribute("download", "b.zip");
  });

  it("downloads via a converted blob url, not the raw data: URI, for the dev fallback", () => {
    vi.spyOn(AttachmentViewerProvider, "useAttachmentViewer").mockReturnValue({ open: vi.fn() });
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock-url"), revokeObjectURL: vi.fn() });

    render(
      <ItemDetail
        item={baseItem({
          attachments: [
            {
              id: "p1",
              url: "data:application/pdf;base64,aGVsbG8=",
              mimeType: "application/pdf",
              filename: "מבחן.pdf",
              kind: "pdf",
            },
          ],
        })}
      />
    );

    const link = screen.getByText("הורדה");
    expect(link).toHaveAttribute("href", "blob:mock-url");
    expect(link).toHaveAttribute("download", "מבחן.pdf");
    vi.unstubAllGlobals();
  });
});
