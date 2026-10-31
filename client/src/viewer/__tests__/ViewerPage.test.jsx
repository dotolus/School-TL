/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import { ViewerPage } from "../ViewerPage";

const mockApi = vi.hoisted(() => ({ getTimeline: vi.fn() }));
vi.mock("../../useDatasetApi", async () => {
  const actual = await vi.importActual("../../useDatasetApi");
  return { ...actual, useDatasetApi: () => mockApi };
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:school/:period/:class" element={<ViewerPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ViewerPage", () => {
  it("shows an empty-dataset hint (naming the dataset and the expected order) when no items come back", async () => {
    mockApi.getTimeline.mockResolvedValue({ items: [] });

    renderAt("/e4/2026-2027/reut");

    await waitFor(() => expect(screen.getByText("e4")).toBeInTheDocument());
    expect(screen.getByText("reut")).toBeInTheDocument();
    expect(screen.getByText("2026-2027")).toBeInTheDocument();
    expect(screen.getByText(/סדר החלקים בה הפוך/)).toBeInTheDocument();
  });
});
