/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import { AdminPage } from "../AdminPage";
import { api } from "../../api";

// AdminPage also renders ImportPanel/BackupPanel/HistoryPanel, which call
// useDatasetApi() too and hit their own methods on mount (getBackups,
// getHistory) - the mock needs the full method set, not just getTimeline,
// or those children throw "not a function" during the render this test
// triggers.
const mockDatasetApi = vi.hoisted(() => ({
  getTimeline: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  importTimeline: vi.fn(),
  uploadItemAttachment: vi.fn(),
  deleteItemAttachment: vi.fn(),
  getHistory: vi.fn(),
  restoreHistoryEvent: vi.fn(),
  getBackups: vi.fn(),
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
}));
vi.mock("../../useDatasetApi", async () => {
  const actual = await vi.importActual("../../useDatasetApi");
  return { ...actual, useDatasetApi: () => mockDatasetApi };
});
vi.mock("../../api", () => ({ api: { me: vi.fn(), logout: vi.fn() } }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:school/:period/:class/admin" element={<AdminPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminPage", () => {
  it("shows which dataset is being edited", async () => {
    api.me.mockResolvedValue({ isAdmin: true });
    mockDatasetApi.getTimeline.mockResolvedValue({ items: [] });
    mockDatasetApi.getBackups.mockResolvedValue({ backups: [] });
    mockDatasetApi.getHistory.mockResolvedValue({ events: [] });

    renderAt("/reut/2026-2027/e4/admin");

    await waitFor(() => expect(screen.getByText(/reut/)).toBeInTheDocument());
    expect(screen.getByText(/e4/)).toBeInTheDocument();
    expect(screen.getByText(/2026-2027/)).toBeInTheDocument();
  });

  it("reflects whatever dataset is in the URL, not a hardcoded default", async () => {
    api.me.mockResolvedValue({ isAdmin: true });
    mockDatasetApi.getTimeline.mockResolvedValue({ items: [] });
    mockDatasetApi.getBackups.mockResolvedValue({ backups: [] });
    mockDatasetApi.getHistory.mockResolvedValue({ events: [] });

    renderAt("/some-other-school/1999-2000/z9/admin");

    await waitFor(() => expect(screen.getByText(/some-other-school/)).toBeInTheDocument());
    expect(screen.getByText(/z9/)).toBeInTheDocument();
    expect(screen.getByText(/1999-2000/)).toBeInTheDocument();
  });
});
