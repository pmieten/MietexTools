import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pad, timestamp, log } from "../helpers.js";

describe("pad", () => {
  it("pads single-digit numbers with a leading zero", () => {
    expect(pad(1)).toBe("01");
    expect(pad(9)).toBe("09");
  });

  it("does not pad double-digit numbers", () => {
    expect(pad(10)).toBe("10");
    expect(pad(42)).toBe("42");
  });

  it("handles zero", () => {
    expect(pad(0)).toBe("00");
  });
});

describe("timestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns formatted timestamp YYYY-MM-DD-HHmmss", () => {
    const now = new Date(2026, 5, 23, 14, 5, 3); // June 23, 2026, 14:05:03
    vi.setSystemTime(now);
    expect(timestamp()).toBe("2026-06-23-140503");
  });

  it("pads all components correctly", () => {
    const now = new Date(2026, 0, 1, 1, 2, 3); // Jan 1, 2026, 01:02:03
    vi.setSystemTime(now);
    expect(timestamp()).toBe("2026-01-01-010203");
  });
});

describe("log", () => {
  it("prints INFO messages with ℹ prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("INFO", "test message");
    expect(spy).toHaveBeenCalledWith("[ℹ] test message");
    spy.mockRestore();
  });

  it("prints OK messages with ✔ prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("OK", "success");
    expect(spy).toHaveBeenCalledWith("[✔] success");
    spy.mockRestore();
  });

  it("prints WARN messages with ⚠ prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("WARN", "warning");
    expect(spy).toHaveBeenCalledWith("[⚠] warning");
    spy.mockRestore();
  });

  it("prints ERROR messages with ✖ prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("ERROR", "error");
    expect(spy).toHaveBeenCalledWith("[✖] error");
    spy.mockRestore();
  });
});