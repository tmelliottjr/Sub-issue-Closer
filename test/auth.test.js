import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getToken } from "../lib/auth.js";

vi.mock("@inquirer/prompts", () => ({
  password: vi.fn(),
}));

describe("auth.js - getToken", () => {
  let originalGitHubToken;
  let consoleLogSpy;
  let passwordPrompt;

  beforeEach(async () => {
    const { password } = await import("@inquirer/prompts");
    passwordPrompt = password;

    originalGitHubToken = process.env.GITHUB_TOKEN;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalGitHubToken !== undefined) {
      process.env.GITHUB_TOKEN = originalGitHubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("should return token from environment variable if available", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token_from_env";

    const token = await getToken();

    expect(token).toBe("ghp_test_token_from_env");
    expect(consoleLogSpy).toHaveBeenCalledWith("✓ Using GITHUB_TOKEN from environment");
    expect(passwordPrompt).not.toHaveBeenCalled();
  });

  it("should prompt for token if environment variable is not set", async () => {
    delete process.env.GITHUB_TOKEN;
    passwordPrompt.mockResolvedValue("ghp_prompted_token");

    const token = await getToken();

    expect(token).toBe("ghp_prompted_token");
    expect(consoleLogSpy).toHaveBeenCalledWith("No GITHUB_TOKEN environment variable found.");
    expect(passwordPrompt).toHaveBeenCalledWith({
      message: "Please enter your GitHub Personal Access Token:",
      mask: "*",
    });
  });

  it("should prompt for token if environment variable is empty string", async () => {
    process.env.GITHUB_TOKEN = "";
    passwordPrompt.mockResolvedValue("ghp_prompted_token_2");

    const token = await getToken();

    // Empty string is falsy, so it should prompt
    expect(consoleLogSpy).toHaveBeenCalledWith("No GITHUB_TOKEN environment variable found.");
    expect(passwordPrompt).toHaveBeenCalled();
  });

  it("should handle user canceling prompt", async () => {
    delete process.env.GITHUB_TOKEN;
    passwordPrompt.mockRejectedValue(new Error("User canceled"));

    await expect(getToken()).rejects.toThrow("User canceled");
  });

  it("should handle different token formats", async () => {
    // Test classic token
    process.env.GITHUB_TOKEN = "ghp_1234567890abcdefghij";
    let token = await getToken();
    expect(token).toBe("ghp_1234567890abcdefghij");

    // Test fine-grained token
    process.env.GITHUB_TOKEN = "github_pat_1234567890";
    token = await getToken();
    expect(token).toBe("github_pat_1234567890");
  });
});
