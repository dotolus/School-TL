/** @vitest-environment jsdom */
import { vi } from "vitest";
import { api, createDatasetApi } from "../api";

function mockFetchOnce({ ok, status, body }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: async () => body })
  );
}

describe("api 401 handling", () => {
  let listener;

  beforeEach(() => {
    listener = vi.fn();
    window.addEventListener("admin-session-expired", listener);
  });

  afterEach(() => {
    window.removeEventListener("admin-session-expired", listener);
    vi.unstubAllGlobals();
  });

  it("dispatches admin-session-expired when a request comes back 401", async () => {
    mockFetchOnce({ ok: false, status: 401, body: { error: "Authentication required" } });
    await expect(api.getThemes()).rejects.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch admin-session-expired for a non-auth error", async () => {
    mockFetchOnce({ ok: false, status: 400, body: { error: "Bad request" } });
    await expect(api.getThemes()).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not dispatch admin-session-expired on success", async () => {
    mockFetchOnce({ ok: true, status: 200, body: { themes: [] } });
    await api.getThemes();
    expect(listener).not.toHaveBeenCalled();
  });

  it("dispatches admin-session-expired when the raw-fetch attachment upload comes back 401", async () => {
    mockFetchOnce({ ok: false, status: 401, body: { error: "Authentication required" } });
    const datasetApi = createDatasetApi({ school: "reut", period: "2026-2027", class: "e4" });

    await expect(
      datasetApi.uploadItemAttachment("item-1", new File(["x"], "x.txt"))
    ).rejects.toThrow();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("dispatches admin-session-expired when the import endpoint comes back 401", async () => {
    mockFetchOnce({ ok: false, status: 401, body: { error: "Authentication required" } });
    const datasetApi = createDatasetApi({ school: "reut", period: "2026-2027", class: "e4" });

    await expect(datasetApi.importTimeline(new File(["[]"], "data.json"))).rejects.toThrow();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
