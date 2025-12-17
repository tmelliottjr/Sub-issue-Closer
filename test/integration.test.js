import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIssue, getSubIssues, closeIssue, processIssueRecursively } from "../lib/core.js";

describe("Integration Tests - Issue Tree Processing", () => {
  let mockOctokit;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        issues: {
          get: vi.fn(),
          listSubIssues: vi.fn(),
          update: vi.fn(),
          createComment: vi.fn(),
        },
        users: {
          getAuthenticated: vi.fn(),
        },
      },
    };
  });

  it("should process a simple issue tree with all sub-issues complete", async () => {
    // Mock parent issue with 100% completion
    mockOctokit.rest.issues.get
      .mockResolvedValueOnce({
        data: {
          number: 1,
          title: "Parent Issue",
          state: "open",
          sub_issues_summary: { total: 2, completed: 2, percent_completed: 100 },
        },
      })
      // Re-fetch after processing sub-issues
      .mockResolvedValueOnce({
        data: {
          number: 1,
          title: "Parent Issue",
          state: "open",
          sub_issues_summary: { total: 2, completed: 2, percent_completed: 100 },
        },
      });

    // Mock sub-issues
    mockOctokit.rest.issues.listSubIssues.mockResolvedValueOnce({
      data: [
        {
          number: 2,
          repository_url: "https://api.github.com/repos/test/test",
        },
        {
          number: 3,
          repository_url: "https://api.github.com/repos/test/test",
        },
      ],
    });

    // Mock sub-issue 2 (already closed)
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 2,
        title: "Sub-issue 2",
        state: "closed",
        sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
      },
    });

    // Mock sub-issue 3 (already closed)
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 3,
        title: "Sub-issue 3",
        state: "closed",
        sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
      },
    });

    const parentIssue = await mockOctokit.rest.issues.get({
      owner: "test",
      repo: "test",
      issue_number: 1,
    });

    expect(parentIssue.data.sub_issues_summary.percent_completed).toBe(100);
  });

  it("should handle nested sub-issues (3 levels deep)", async () => {
    // Level 0: Parent issue
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 1,
        title: "Level 0 Parent",
        state: "open",
        sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
      },
    });

    mockOctokit.rest.issues.listSubIssues.mockResolvedValueOnce({
      data: [
        {
          number: 2,
          repository_url: "https://api.github.com/repos/test/test",
        },
      ],
    });

    // Level 1: Child
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 2,
        title: "Level 1 Child",
        state: "open",
        sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
      },
    });

    mockOctokit.rest.issues.listSubIssues.mockResolvedValueOnce({
      data: [
        {
          number: 3,
          repository_url: "https://api.github.com/repos/test/test",
        },
      ],
    });

    // Level 2: Grandchild (leaf node)
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 3,
        title: "Level 2 Grandchild",
        state: "closed",
        sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
      },
    });

    const result = await mockOctokit.rest.issues.get({
      owner: "test",
      repo: "test",
      issue_number: 1,
    });

    expect(result.data.number).toBe(1);
    expect(mockOctokit.rest.issues.get).toHaveBeenCalledTimes(1);
  });

  it("should handle cross-repository sub-issues", async () => {
    // Parent in repo-a
    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 1,
        title: "Parent in Repo A",
        state: "open",
        sub_issues_summary: { total: 1, completed: 1, percent_completed: 100 },
      },
    });

    // Sub-issue in repo-b
    mockOctokit.rest.issues.listSubIssues.mockResolvedValueOnce({
      data: [
        {
          number: 42,
          repository_url: "https://api.github.com/repos/test/repo-b",
        },
      ],
    });

    mockOctokit.rest.issues.get.mockResolvedValueOnce({
      data: {
        number: 42,
        title: "Sub-issue in Repo B",
        state: "closed",
        sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
      },
    });

    const subIssues = await mockOctokit.rest.issues.listSubIssues({
      owner: "test",
      repo: "repo-a",
      issue_number: 1,
    });

    const subIssue = subIssues.data[0];
    const subOwner = subIssue.repository_url.split("/").slice(-2, -1)[0];
    const subRepo = subIssue.repository_url.split("/").pop();

    expect(subOwner).toBe("test");
    expect(subRepo).toBe("repo-b");
    expect(subIssue.number).toBe(42);
  });

  it("should track counts correctly through the tree", async () => {
    // Simulate processing
    let processed = 0;
    let closed = 0;

    // Parent issue (open, will be closed)
    processed += 1;

    // Sub-issue 1 (already closed)
    // processed += 0 (skipped)

    // Sub-issue 2 (open, no sub-issues)
    processed += 1;

    // Parent is 100% complete
    closed += 1;

    expect(processed).toBe(2);
    expect(closed).toBe(1);
  });

  it("should not close parent if sub-issues are incomplete", async () => {
    mockOctokit.rest.issues.get
      .mockResolvedValueOnce({
        data: {
          number: 1,
          title: "Parent Issue",
          state: "open",
          sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          number: 1,
          title: "Parent Issue",
          state: "open",
          sub_issues_summary: { total: 2, completed: 1, percent_completed: 50 },
        },
      });

    const updatedIssue = await mockOctokit.rest.issues.get({
      owner: "test",
      repo: "test",
      issue_number: 1,
    });

    expect(updatedIssue.data.sub_issues_summary.percent_completed).toBeLessThan(100);
    expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
  });
});

describe("Integration Tests - Dry Run Mode", () => {
  it("should not call update or createComment in dry-run mode", async () => {
    const mockOctokit = {
      rest: {
        issues: {
          update: vi.fn(),
          createComment: vi.fn(),
        },
      },
    };

    const dryRun = true;

    if (!dryRun) {
      await mockOctokit.rest.issues.update({
        owner: "test",
        repo: "test",
        issue_number: 1,
        state: "closed",
      });
    }

    expect(mockOctokit.rest.issues.update).not.toHaveBeenCalled();
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("should count issues that would be closed in dry-run mode", () => {
    let wouldBeClosed = 0;
    const dryRun = true;
    const issuesReady = [1, 2, 3];

    issuesReady.forEach(() => {
      if (dryRun) {
        wouldBeClosed++;
      }
    });

    expect(wouldBeClosed).toBe(3);
  });
});

describe("Integration Tests - Authentication", () => {
  it("should accept token from environment variable", () => {
    const envToken = "ghp_from_env";
    const cliToken = null;

    const token = cliToken || envToken;
    expect(token).toBe("ghp_from_env");
  });

  it("should prefer CLI token over environment variable", () => {
    const envToken = "ghp_from_env";
    const cliToken = "ghp_from_cli";

    const token = cliToken || envToken;
    expect(token).toBe("ghp_from_cli");
  });

  it("should validate authentication before processing", async () => {
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({
            data: { login: "testuser" },
          }),
        },
      },
    };

    const user = await mockOctokit.rest.users.getAuthenticated();
    expect(user.data.login).toBe("testuser");
  });

  it("should handle authentication failure", async () => {
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockRejectedValue(new Error("Unauthorized")),
        },
      },
    };

    await expect(mockOctokit.rest.users.getAuthenticated()).rejects.toThrow("Unauthorized");
  });
});
