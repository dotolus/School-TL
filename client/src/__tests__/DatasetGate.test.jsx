/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DatasetGate } from "../DatasetGate";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:school/:period/:class" element={<DatasetGate />}>
          <Route index element={<div>ok</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("DatasetGate", () => {
  it("renders the real page when the period segment looks like a period", () => {
    renderAt("/reut/2026-2027/e4");
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("renders the 404 page when the period segment doesn't look like a period", () => {
    renderAt("/e4/reut/x");
    expect(screen.queryByText("ok")).not.toBeInTheDocument();
    expect(screen.getByText("סדר חלקי הכתובת כנראה הפוך")).toBeInTheDocument();
  });
});
