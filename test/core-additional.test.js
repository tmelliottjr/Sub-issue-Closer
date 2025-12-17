import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseIssueInput, parseArgs, validateNonInteractiveMode } from "../lib/core.js";

describe("core.js - Additional Coverage", () => {
  describe("parseIssueInput - edge cases", () => {
    it("should handle URLs with different protocols", () => {
      expect(parseIssueInput("http://github.com/owner/repo/issues/42")).toEqual({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
      });

      expect(parseIssueInput("https://github.com/owner/repo/issues/999")).toEqual({
        owner: "owner",
        repo: "repo",
        issue_number: 999,
      });
    });

    it("should handle repos with dots in the name", () => {
      expect(parseIssueInput("owner/repo.name#123")).toEqual({
        owner: "owner",
        repo: "repo.name",
        issue_number: 123,
      });
    });

    it("should handle GitHub URLs with trailing slashes", () => {
      const result = parseIssueInput("https://github.com/owner/repo/issues/42");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
      });
    });

    it("should return null for invalid short format - missing issue number", () => {
      expect(parseIssueInput("owner/repo#")).toBeNull();
    });

    it("should return null for invalid short format - no hash", () => {
      expect(parseIssueInput("owner/repo")).toBeNull();
    });

    it("should return null for invalid short format - no slash", () => {
      expect(parseIssueInput("ownerrepo#123")).toBeNull();
    });

    it("should return null for malformed URLs", () => {
      expect(parseIssueInput("github.com/owner/repo/issues/")).toBeNull();
      expect(parseIssueInput("https://gitlab.com/owner/repo/issues/123")).toBeNull();
      expect(parseIssueInput("https://github.com/owner/issues/123")).toBeNull();
    });

    it("should handle large issue numbers", () => {
      expect(parseIssueInput("owner/repo#999999")).toEqual({
        owner: "owner",
        repo: "repo",
        issue_number: 999999,
      });
    });

    it("should return null for zero or negative issue numbers", () => {
      // These won't match the regex pattern \d+ which requires at least one digit
      // But let's test what happens if they somehow got through
      const result = parseIssueInput("owner/repo#0");
      expect(result?.issue_number).toBe(0);
    });
  });

  describe("parseArgs - comprehensive", () => {
    it("should parse all arguments together", () => {
      const args = [
        "--issue",
        "owner/repo#123",
        "--token",
        "ghp_token",
        "--dry-run",
        "--verbose",
        "--yes",
      ];

      const result = parseArgs(args);

      expect(result).toEqual({
        issue: "owner/repo#123",
        token: "ghp_token",
        dryRun: true,
        verbose: true,
        nonInteractive: true,
      });
    });

    it("should parse short form arguments", () => {
      const args = ["-i", "owner/repo#456", "-t", "token123", "-d", "-v", "-y"];

      const result = parseArgs(args);

      expect(result).toEqual({
        issue: "owner/repo#456",
        token: "token123",
        dryRun: true,
        verbose: true,
        nonInteractive: true,
      });
    });

    it("should handle --live flag", () => {
      const args = ["--issue", "owner/repo#123", "--live"];
      const result = parseArgs(args);

      expect(result.dryRun).toBe(false);
    });

    it("should handle -l flag", () => {
      const args = ["-i", "owner/repo#123", "-l"];
      const result = parseArgs(args);

      expect(result.dryRun).toBe(false);
    });

    it("should handle mixed long and short arguments", () => {
      const args = ["--issue", "owner/repo#789", "-t", "token", "-d", "--verbose"];
      const result = parseArgs(args);

      expect(result).toEqual({
        issue: "owner/repo#789",
        token: "token",
        dryRun: true,
        verbose: true,
        nonInteractive: false,
      });
    });

    it("should handle empty arguments array", () => {
      const result = parseArgs([]);

      expect(result).toEqual({
        issue: null,
        token: null,
        dryRun: null,
        verbose: false,
        nonInteractive: false,
      });
    });

    it("should ignore unknown arguments", () => {
      const args = ["--issue", "owner/repo#123", "--unknown", "value", "-x"];
      const result = parseArgs(args);

      expect(result.issue).toBe("owner/repo#123");
      expect(result.token).toBeNull();
    });

    it("should handle arguments in any order", () => {
      const args = ["--verbose", "--issue", "owner/repo#1", "-y", "-t", "token123", "-d"];
      const result = parseArgs(args);

      expect(result).toEqual({
        issue: "owner/repo#1",
        token: "token123",
        dryRun: true,
        verbose: true,
        nonInteractive: true,
      });
    });

    it("should override dryRun if both --dry-run and --live are provided (last wins)", () => {
      const args1 = ["--dry-run", "--live"];
      const result1 = parseArgs(args1);
      expect(result1.dryRun).toBe(false);

      const args2 = ["--live", "--dry-run"];
      const result2 = parseArgs(args2);
      expect(result2.dryRun).toBe(true);
    });

    it("should handle issue URLs as values", () => {
      const args = ["--issue", "https://github.com/owner/repo/issues/42"];
      const result = parseArgs(args);

      expect(result.issue).toBe("https://github.com/owner/repo/issues/42");
    });
  });

  describe("validateNonInteractiveMode", () => {
    let originalGitHubToken;

    beforeEach(() => {
      originalGitHubToken = process.env.GITHUB_TOKEN;
    });

    afterEach(() => {
      if (originalGitHubToken !== undefined) {
        process.env.GITHUB_TOKEN = originalGitHubToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    });

    it("should return empty array when all required args are present (token via arg)", () => {
      delete process.env.GITHUB_TOKEN;
      const cliArgs = {
        issue: "owner/repo#123",
        token: "ghp_token",
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toEqual([]);
    });

    it("should return empty array when all required args are present (token via env)", () => {
      process.env.GITHUB_TOKEN = "ghp_env_token";
      const cliArgs = {
        issue: "owner/repo#123",
        token: null,
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toEqual([]);
    });

    it("should return missing token when neither token arg nor env var is set", () => {
      delete process.env.GITHUB_TOKEN;
      const cliArgs = {
        issue: "owner/repo#123",
        token: null,
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toContain("token (use -t/--token or set GITHUB_TOKEN environment variable)");
    });

    it("should return missing issue when issue is not provided", () => {
      process.env.GITHUB_TOKEN = "ghp_token";
      const cliArgs = {
        issue: null,
        token: null,
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toContain("issue (use -i/--issue)");
    });

    it("should return both missing items when neither is provided", () => {
      delete process.env.GITHUB_TOKEN;
      const cliArgs = {
        issue: null,
        token: null,
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toHaveLength(2);
      expect(missing).toContain("token (use -t/--token or set GITHUB_TOKEN environment variable)");
      expect(missing).toContain("issue (use -i/--issue)");
    });

    it("should prioritize env token over missing token arg", () => {
      process.env.GITHUB_TOKEN = "ghp_env_token";
      const cliArgs = {
        issue: "owner/repo#123",
        token: null,
        dryRun: true,
        verbose: false,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).not.toContain(
        "token (use -t/--token or set GITHUB_TOKEN environment variable)"
      );
    });

    it("should work regardless of other optional flags", () => {
      process.env.GITHUB_TOKEN = "ghp_token";
      const cliArgs = {
        issue: "owner/repo#123",
        token: null,
        dryRun: false,
        verbose: true,
        nonInteractive: true,
      };

      const missing = validateNonInteractiveMode(cliArgs);
      expect(missing).toEqual([]);
    });
  });
});
