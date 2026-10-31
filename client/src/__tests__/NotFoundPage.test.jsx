/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:school/:period" element={<NotFoundPage />} />
        <Route path="/:school" element={<NotFoundPage />} />
        <Route path="/" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("NotFoundPage", () => {
  it("says the class is missing when school and period are given", () => {
    renderAt("/reut/2026-2027");
    expect(screen.getByText("לא צוינה כיתה בכתובת")).toBeInTheDocument();
    expect(screen.getByText("/reut/2026-2027/<כיתה>")).toBeInTheDocument();
  });

  it("says period and class are missing when only school is given", () => {
    renderAt("/reut");
    expect(screen.getByText("לא צוינו שנה וכיתה בכתובת")).toBeInTheDocument();
    expect(screen.getByText("/reut/<שנה>/<כיתה>")).toBeInTheDocument();
  });

  it("says everything is missing at the bare root, with a concrete example", () => {
    renderAt("/");
    expect(screen.getByText("לא צוינו בית ספר, שנה וכיתה בכתובת")).toBeInTheDocument();
    expect(screen.getByText("/<בית ספר>/<שנה>/<כיתה>")).toBeInTheDocument();
    expect(screen.getByText("/reut/2026-2027/e4")).toBeInTheDocument();
  });

  it("falls back to the same page for an unmatched path", () => {
    renderAt("/a/b/c/d/e");
    expect(screen.getByText("לא צוינו בית ספר, שנה וכיתה בכתובת")).toBeInTheDocument();
  });
});
