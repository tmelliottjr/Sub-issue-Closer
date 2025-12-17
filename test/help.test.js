import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showHelp } from "../lib/help.js";

describe("help.js - showHelp", () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should display help message", () => {
    showHelp();

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const helpMessage = consoleLogSpy.mock.calls[0][0];

    // Verify key sections are present
    expect(helpMessage).toContain("GitHub Sub-Issue Closer");
    expect(helpMessage).toContain("USAGE:");
    expect(helpMessage).toContain("OPTIONS:");
    expect(helpMessage).toContain("AUTHENTICATION:");
    expect(helpMessage).toContain("EXAMPLES:");
  });

  it("should include all command-line options", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("-i, --issue");
    expect(helpMessage).toContain("-t, --token");
    expect(helpMessage).toContain("-d, --dry-run");
    expect(helpMessage).toContain("-l, --live");
    expect(helpMessage).toContain("-v, --verbose");
    expect(helpMessage).toContain("-y, --yes");
    expect(helpMessage).toContain("-h, --help");
  });

  it("should explain issue input formats", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("ISSUE INPUT FORMATS:");
    expect(helpMessage).toContain("owner/repo#123");
    expect(helpMessage).toContain("https://github.com/owner/repo/issues/123");
  });

  it("should include authentication guidance", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("GITHUB_TOKEN");
    expect(helpMessage).toContain("export GITHUB_TOKEN");
    expect(helpMessage).toContain("Token Requirements:");
  });

  it("should provide examples", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("node index.js");
    expect(helpMessage).toContain("--dry-run");
    expect(helpMessage).toContain("--live");
    expect(helpMessage).toContain("Non-interactive mode");
  });

  it("should mention features", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("FEATURES:");
    expect(helpMessage).toContain("Recursive processing");
    expect(helpMessage).toContain("Smart completion detection");
    expect(helpMessage).toContain("Dry-run mode");
  });

  it("should reference documentation", () => {
    showHelp();

    const helpMessage = consoleLogSpy.mock.calls[0][0];

    expect(helpMessage).toContain("DOCUMENTATION:");
    expect(helpMessage).toContain("README.md");
  });
});
