/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { BackupPanel } from "../BackupPanel";

const mockApi = vi.hoisted(() => ({ getBackups: vi.fn(), createBackup: vi.fn(), restoreBackup: vi.fn() }));
vi.mock("../../useDatasetApi", () => ({ useDatasetApi: () => mockApi }));

describe("BackupPanel", () => {
  beforeEach(() => {
    mockApi.getBackups.mockResolvedValue({ backups: [] });
  });

  it("lists existing backups", async () => {
    mockApi.getBackups.mockResolvedValue({
      backups: [{ id: "2026-10-23", createdAt: "2026-10-23T06:00:00.000Z", itemCount: 12 }],
    });

    render(<BackupPanel />);

    await waitFor(() => expect(screen.getByText("2026-10-23")).toBeInTheDocument());
    expect(screen.getByText(/12 פריטים/)).toBeInTheDocument();
  });

  it("creates a new backup and reloads the list", async () => {
    mockApi.createBackup.mockResolvedValue({ id: "2026-10-23", createdAt: "x", itemCount: 1 });

    render(<BackupPanel />);
    await waitFor(() => expect(mockApi.getBackups).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("גיבוי עכשיו"));

    await waitFor(() => expect(mockApi.createBackup).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockApi.getBackups).toHaveBeenCalledTimes(2));
  });

  it("restores a backup, shows a summary, and notifies the parent", async () => {
    mockApi.getBackups.mockResolvedValue({
      backups: [{ id: "2026-10-23", createdAt: "2026-10-23T06:00:00.000Z", itemCount: 3 }],
    });
    mockApi.restoreBackup.mockResolvedValue({
      id: "2026-10-23",
      restored: [{ id: "a" }, { id: "b" }],
      skipped: [{ id: "c", error: "boom" }],
    });
    const onRestored = vi.fn();

    render(<BackupPanel onRestored={onRestored} />);
    await waitFor(() => expect(screen.getByText("2026-10-23")).toBeInTheDocument());

    fireEvent.click(screen.getByText("שחזור (מחליף את כל הנתונים הנוכחיים)"));

    await waitFor(() => expect(mockApi.restoreBackup).toHaveBeenCalledWith("2026-10-23"));
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/2 פריטים שוחזרו/)).toBeInTheDocument();
    expect(screen.getByText(/1 פריטים לא ניתן היה לשחזר/)).toBeInTheDocument();
  });

  it("shows an error if creating a backup fails", async () => {
    mockApi.createBackup.mockRejectedValue(new Error("Backup failed"));

    render(<BackupPanel />);
    await waitFor(() => expect(mockApi.getBackups).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("גיבוי עכשיו"));

    await waitFor(() => expect(screen.getByText("Backup failed")).toBeInTheDocument());
  });
});
