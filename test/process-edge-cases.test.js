import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processIssueRecursively, closeIssue } from "../lib/core.js";

describe("core.js - processIssueRecursively Edge Cases", () => {
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

  describe("verbose mode output", () => {
    it("should show detailed output for already closed issue (verbose)", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "Closed Issue",
          state: "closed",
          sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
        },
      });

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      // Should log issue status and skip message
      expect(consoleLogSpy).toHaveBeenCalled();
      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("owner/repo#1");
      expect(logs).toContain("Already closed, skipping");
    });

    it("should show detailed output for issue with no sub-issues (verbose)", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "No Subs",
          state: "open",
          sub_issues_summary: null,
        },
      });

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("No sub-issues");
    });

    it("should show detailed output when closing issue (dry-run, verbose)", async () => {
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

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, true, true);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("Would close (all sub-issues complete)");
    });

    it("should show detailed output when closing issue (live, verbose)", async () => {
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

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("Closing (all sub-issues complete)");
    });

    it("should show detailed output when keeping issue open (verbose)", async () => {
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
            sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [{ number: 2, repository_url: "https://api.github.com/repos/owner/repo" }],
      });

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("Keeping open");
      expect(logs).toContain("1/2 sub-issues complete");
    });
  });

  describe("non-verbose mode output", () => {
    it("should show minimal output when closing issue (dry-run, non-verbose)", async () => {
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

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, true, false);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("owner/repo#1");
      expect(logs).toContain("would be closed");
    });

    it("should show minimal output when closing issue (live, non-verbose)", async () => {
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

      await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, false);

      const logs = consoleLogSpy.mock.calls.map((call) => call[0]).join("\n");
      expect(logs).toContain("owner/repo#1");
      expect(logs).toContain("(closed)");
    });
  });

  describe("depth and indentation", () => {
    it("should handle nested issues at various depths", async () => {
      // Depth 0
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Level 0",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        // Depth 1
        .mockResolvedValueOnce({
          data: {
            number: 2,
            title: "Level 1",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        // Depth 2
        .mockResolvedValueOnce({
          data: {
            number: 3,
            title: "Level 2",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        // Re-fetch level 1
        .mockResolvedValueOnce({
          data: {
            number: 2,
            title: "Level 1",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        })
        // Re-fetch level 0
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Level 0",
            state: "open",
            sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
          },
        });

      mockOctokit.rest.issues.listSubIssues
        .mockResolvedValueOnce({
          data: [{ number: 2, repository_url: "https://api.github.com/repos/owner/repo" }],
        })
        .mockResolvedValueOnce({
          data: [{ number: 3, repository_url: "https://api.github.com/repos/owner/repo" }],
        });

      mockOctokit.rest.issues.update.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      const result = await processIssueRecursively(mockOctokit, "owner", "repo", 1, 0, false, true);

      // Should process all 3 issues and close the 2 that are complete
      expect(result.processed).toBe(2); // Level 0 and 1 (Level 2 was already closed)
      expect(result.closed).toBe(2); // Level 0 and 1
    });
  });

  describe("cross-repository sub-issues", () => {
    it("should handle sub-issues from different repositories", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 2, completed: 2, percent_completed: 100 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 5,
            title: "Cross-repo sub 1",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 10,
            title: "Cross-repo sub 2",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 2, completed: 2, percent_completed: 100 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [
          { number: 5, repository_url: "https://api.github.com/repos/org1/repo1" },
          { number: 10, repository_url: "https://api.github.com/repos/org2/repo2" },
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

      // Should correctly parse different repository URLs
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "org1", repo: "repo1", issue_number: 5 })
      );
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "org2", repo: "repo2", issue_number: 10 })
      );
    });
  });

  describe("sub_issues_summary variations", () => {
    it("should handle null sub_issues_summary", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "No Summary",
          state: "open",
          sub_issues_summary: null,
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
    });

    it("should handle undefined sub_issues_summary", async () => {
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          number: 1,
          title: "No Summary",
          state: "open",
          // sub_issues_summary is undefined
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
    });

    it("should handle partial completion correctly", async () => {
      mockOctokit.rest.issues.get
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 3, completed: 2, percent_completed: 66 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 2,
            title: "Sub 1",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 3,
            title: "Sub 2",
            state: "closed",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 4,
            title: "Sub 3",
            state: "open",
            sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            number: 1,
            title: "Parent",
            state: "open",
            sub_issues_summary: { total: 3, completed: 2, percent_completed: 66 },
          },
        });

      mockOctokit.rest.issues.listSubIssues.mockResolvedValue({
        data: [
          { number: 2, repository_url: "https://api.github.com/repos/owner/repo" },
          { number: 3, repository_url: "https://api.github.com/repos/owner/repo" },
          { number: 4, repository_url: "https://api.github.com/repos/owner/repo" },
        ],
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

      // Should not close parent since not 100%
      expect(result.closed).toBe(0);
      expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
    });
  });
});
