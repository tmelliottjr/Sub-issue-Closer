import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getIssue, getSubIssues, closeIssue, processIssueRecursively } from "../lib/core.js";

describe("Full Coverage Tests - Core Functions", () => {
  let mockOctokit;
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockOctokit = {
      rest: {
        issues: {
          get: vi.fn(),
          listSubIssues: vi.fn(),
          update: vi.fn(),
          createComment: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("getIssue", () => {
    it("should fetch issue successfully", async () => {
      const mockIssue = {
        number: 1,
        title: "Test Issue",
        state: "open",
        sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
      };
      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue });

      const result = await getIssue(mockOctokit, "owner", "repo", 1);

      expect(result).toEqual(mockIssue);
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
      });
    });

    it("should throw meaningful error for 404", async () => {
      const error = new Error("Not Found");
      error.status = 404;
      mockOctokit.rest.issues.get.mockRejectedValue(error);

      await expect(getIssue(mockOctokit, "owner", "repo", 999)).rejects.toThrow(
        "Issue #999 not found in owner/repo"
      );
    });

    it("should rethrow non-404 errors", async () => {
      const error = new Error("Server Error");
      error.status = 500;
      mockOctokit.rest.issues.get.mockRejectedValue(error);

      await expect(getIssue(mockOctokit, "owner", "repo", 1)).rejects.toThrow("Server Error");
    });
  });

  describe("getSubIssues", () => {
    it("should fetch sub-issues successfully", async () => {
      const mockSubIssues = [
        { number: 2, repository_url: "https://api.github.com/repos/owner/repo" },
        { number: 3, repository_url: "https://api.github.com/repos/owner/repo" },
      ];
      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({ data: mockSubIssues });

      const result = await getSubIssues(mockOctokit, "owner", "repo", 1);

      expect(result).toEqual(mockSubIssues);
      expect(mockOctokit.rest.issues.listSubIssues).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
        per_page: 100,
      });
    });

    it("should return empty array for 404", async () => {
      const error = new Error("Not Found");
      error.status = 404;
      mockOctokit.rest.issues.listSubIssues.mockRejectedValue(error);

      const result = await getSubIssues(mockOctokit, "owner", "repo", 1);

      expect(result).toEqual([]);
    });

    it("should rethrow non-404 errors", async () => {
      const error = new Error("Server Error");
      error.status = 500;
      mockOctokit.rest.issues.listSubIssues.mockRejectedValue(error);

      await expect(getSubIssues(mockOctokit, "owner", "repo", 1)).rejects.toThrow("Server Error");
    });
  });

  describe("closeIssue", () => {
    it("should close issue and add comment", async () => {
      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      await closeIssue(mockOctokit, "owner", "repo", 1, "Test reason");

      expect(mockOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
        state: "closed",
        state_reason: "completed",
      });

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
        body: "🤖 Automatically closed: Test reason",
      });
    });
  });

  describe("processIssueRecursively - comprehensive scenarios", () => {
    it("should skip already closed issues", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "Closed Issue",
          state: "closed",
          sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
        },
      });

      const result = await processIssueRecursively(
        mockOctokit,
        "owner",
        "repo",
        1,
        0,
        false,
        false
      );

      expect(result).toEqual({ processed: 0, closed: 0 });
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
    });

    it("should handle issues with no sub-issues", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "No Sub-issues",
          state: "open",
          sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
        },
      });

      const result = await processIssueRecursively(
        mockOctokit,
        "owner",
        "repo",
        1,
        0,
        false,
        false
      );

      expect(result).toEqual({ processed: 1, closed: 0 });
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
    });

    it("should close issue when all sub-issues complete (dry-run)", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 2,
            title: "Child",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [{ number: 2, repository_url: "https://api.github.com/repos/owner/repo" }],
      });

      const result = await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, true, false);

      expect(result.closed).toBe(1);
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled(); // Dry-run
    });

    it("should close issue when all sub-issues complete (live mode)", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 2,
            title: "Child",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [{ number: 2, repository_url: "https://api.github.com/repos/owner/repo" }],
      });

      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      const result = await processIssueRecursively(
        mockOctokit,
        "owner",
        "repo",
        1,
        0,
        false,
        false
      );

      expect(result.closed).toBe(1);
      expect(mockOctokit.rest.issues.update).toHaveBeenCalled(); // Live mode
    });

    it("should keep open when sub-issues incomplete", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [],
      });

      const result = await processIssueRecursively(
        mockOctokit,
        "owner",
        "repo",
        1,
        0,
        false,
        false
      );

      expect(result.closed).toBe(0);
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
    });

    it("should output verbose information", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "Test",
          state: "closed",
          sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
        },
      });

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls.some((call) => call[0].includes("owner/repo#1"))).toBe(true);
    });

    it("should handle cross-repository sub-issues", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent in Repo A",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 42,
            title: "Child in Repo B",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent in Repo A",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [
          {
            number: 42,
            repository_url: "https://api.github.com/repos/other-owner/other-repo",
          },
        ],
      });

      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      const result = await processIssueRecursively(
        mockOctokit,
        "owner",
        "repo",
        1,
        0,
        false,
        false
      );

      expect(result.closed).toBe(1);
      // Verify it fetched from different repo
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "other-owner",
          repo: "other-repo",
          issue_number: 42,
        })
      );
    });
  });
});
