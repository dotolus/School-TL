/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ItemDetail } from "../ItemDetail";
import * as LightboxProvider from "../LightboxProvider";

function baseItem(detail) {
  return { full: "Tuesday, 16.3.2027", detail };
}

describe("ItemDetail", () => {
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

  it("clicking an image thumbnail opens the lightbox with its url", () => {
    const open = vi.fn();
    vi.spyOn(LightboxProvider, "useLightbox").mockReturnValue({ open });

    render(<ItemDetail item={baseItem({ images: [{ id: "i1", url: "/uploads/a/b.png" }] })} />);
    fireEvent.click(screen.getByRole("button"));

    expect(open).toHaveBeenCalledWith("/uploads/a/b.png");
  });
});
