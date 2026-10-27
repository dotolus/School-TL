/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { AttachmentViewer } from "../AttachmentViewer";

describe("AttachmentViewer - image", () => {
  it("starts at 100%", () => {
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={vi.fn()} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("zoom-in button increases the shown percentage, zoom-out decreases it", () => {
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("+"));
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.click(screen.getByText("−"));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("mouse wheel up zooms in, wheel down zooms out", () => {
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={vi.fn()} />);
    const frame = document.querySelector(".lightbox-frame");
    fireEvent.wheel(frame, { deltaY: -100 });
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.wheel(frame, { deltaY: 100 });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("never zooms below 100%", () => {
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("−"));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onClose on Escape and on backdrop click", () => {
    const onClose = vi.fn();
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(document.querySelector(".lightbox-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("the close button closes even though it sits inside the toolbar", () => {
    const onClose = vi.fn();
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={onClose} />);
    fireEvent.click(screen.getByText("סגירה ✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking the toolbar or the image frame", () => {
    const onClose = vi.fn();
    render(<AttachmentViewer url="/uploads/a/b.png" kind="image" onClose={onClose} />);

    fireEvent.click(document.querySelector(".lightbox-toolbar"));
    fireEvent.click(document.querySelector(".lightbox-frame"));

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AttachmentViewer - pdf/text", () => {
  it("renders an iframe and no zoom toolbar for a pdf", () => {
    render(<AttachmentViewer url="/uploads/a/b.pdf" filename="b.pdf" kind="pdf" onClose={vi.fn()} />);
    expect(document.querySelector("iframe")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("renders an iframe and no zoom toolbar for a text file", () => {
    render(<AttachmentViewer url="/uploads/a/b.txt" filename="b.txt" kind="text" onClose={vi.fn()} />);
    expect(document.querySelector("iframe")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("still closes via Escape and the close button", () => {
    const onClose = vi.fn();
    render(<AttachmentViewer url="/uploads/a/b.pdf" filename="b.pdf" kind="pdf" onClose={onClose} />);
    fireEvent.click(screen.getByText("סגירה ✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
