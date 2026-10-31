/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Footer } from "../Footer";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:school/:period/:class" element={<Footer />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Footer", () => {
  it("links to the admin page of the dataset currently being viewed", () => {
    renderAt("/reut/2026-2027/e4");

    expect(screen.getByText("הניהול")).toHaveAttribute("href", "/reut/2026-2027/e4/admin");
  });
});
