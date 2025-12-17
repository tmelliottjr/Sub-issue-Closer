/**
 * Core functions for the GitHub Sub-Issue Closer
 */

/**
 * Parses issue URL or accepts owner/repo#number format
 * @param {string} issueInput - The issue reference to parse
 * @returns {Object|null} Parsed issue info or null if invalid
 */
export function parseIssueInput(issueInput) {
  // Pattern: owner/repo#number
  const shortPattern = /^([^\/]+)\/([^#]+)#(\d+)$/;
  const shortMatch = issueInput.match(shortPattern);

  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      issue_number: parseInt(shortMatch[3]),
    };
  }

  // Pattern: https://github.com/owner/repo/issues/number
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/;
  const urlMatch = issueInput.match(urlPattern);

  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      issue_number: parseInt(urlMatch[3]),
    };
  }

  return null;
}

/**
 * Parses CLI arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed arguments
 */
export function parseArgs(args) {
  const parsed = {
    issue: null,
    token: null,
    dryRun: null,
    verbose: false,
    nonInteractive: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--issue" || arg === "-i") {
      parsed.issue = args[++i];
    } else if (arg === "--token" || arg === "-t") {
      parsed.token = args[++i];
    } else if (arg === "--dry-run" || arg === "-d") {
      parsed.dryRun = true;
    } else if (arg === "--live" || arg === "-l") {
      parsed.dryRun = false;
    } else if (arg === "--verbose" || arg === "-v") {
      parsed.verbose = true;
    } else if (arg === "-y" || arg === "--yes") {
      parsed.nonInteractive = true;
    }
  }

  return parsed;
}

/**
 * Fetches issue details including sub-issue summary
 * @param {Object} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issue_number - Issue number
 * @returns {Promise<Object>} Issue data
 */
export async function getIssue(octokit, owner, repo, issue_number) {
  try {
    const { data } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number,
    });
    return data;
  } catch (error) {
    if (error.status === 404) {
      throw new Error(`Issue #${issue_number} not found in ${owner}/${repo}`);
    }
    throw error;
  }
}

/**
 * Fetches all sub-issues for a given parent issue
 * @param {Object} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issue_number - Issue number
 * @returns {Promise<Array>} Array of sub-issues
 */
export async function getSubIssues(octokit, owner, repo, issue_number) {
  try {
    const { data } = await octokit.rest.issues.listSubIssues({
      owner,
      repo,
      issue_number,
      per_page: 100,
    });
    return data;
  } catch (error) {
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Closes an issue with a comment
 * @param {Object} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issue_number - Issue number
 * @param {string} reason - Reason for closing
 * @returns {Promise<void>}
 */
export async function closeIssue(octokit, owner, repo, issue_number, reason) {
  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number,
    state: "closed",
    state_reason: "completed",
  });

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number,
    body: `🤖 Automatically closed: ${reason}`,
  });
}

/**
 * Recursively processes sub-issues and closes those with 100% completion
 * @param {Object} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issue_number - Issue number
 * @param {number} depth - Current depth in the tree
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {Promise<Object>} Result with processed and closed counts
 */
export async function processIssueRecursively(
  octokit,
  owner,
  repo,
  issue_number,
  depth = 0,
  dryRun = false,
  verbose = false
) {
  const indent = "  ".repeat(depth);

  // Fetch issue details
  const issue = await getIssue(octokit, owner, repo, issue_number);
  const issueRef = `${owner}/${repo}#${issue_number}`;

  // Color codes and status symbols
  const greenOpen = "\x1b[32mʘ\x1b[0m"; // Green open circle
  const purpleClosed = "\x1b[38;2;171;28;232m⊘\x1b[0m"; // Purple closed circle (RGB: 171, 28, 232)
  const softOrange = "\x1b[38;2;255;165;80m·\x1b[0m"; // Soft orange info dot
  const statusSymbol = issue.state === "closed" ? purpleClosed : greenOpen;
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";
  const reset = "\x1b[0m";

  if (verbose) {
    console.log(
      `${indent}${statusSymbol} ${bold}${issueRef}${reset} ${dim}- "${issue.title}"${reset}`
    );
  }

  // Check if issue is already closed
  if (issue.state === "closed") {
    if (verbose) {
      console.log(`${indent}   ${softOrange} ${dim}Already closed, skipping${reset}`);
    }
    return { processed: 0, closed: 0 };
  }

  // Check sub-issues summary
  const subIssueSummary = issue.sub_issues_summary;

  if (!subIssueSummary || subIssueSummary.total === 0) {
    if (verbose) {
      console.log(`${indent}   ${softOrange} ${dim}No sub-issues${reset}`);
    }
    return { processed: 1, closed: 0 };
  }

  if (verbose) {
    console.log(
      `${indent}   ${dim}Sub-issues: ${subIssueSummary.completed}/${subIssueSummary.total} complete (${subIssueSummary.percent_completed}%)${reset}`
    );
  }

  // Fetch and process sub-issues recursively
  const subIssues = await getSubIssues(octokit, owner, repo, issue_number);

  let totalProcessed = 1; // Count current issue
  let totalClosed = 0;

  for (const subIssue of subIssues) {
    // Parse sub-issue repository info (may be cross-repo)
    const subOwner = subIssue.repository_url.split("/").slice(-2, -1)[0];
    const subRepo = subIssue.repository_url.split("/").pop();

    const result = await processIssueRecursively(
      octokit,
      subOwner,
      subRepo,
      subIssue.number,
      depth + 1,
      dryRun,
      verbose
    );

    totalProcessed += result.processed;
    totalClosed += result.closed;
  }

  // After processing all sub-issues, check if we should close this issue
  // Re-fetch to get updated sub-issue summary
  const updatedIssue = await getIssue(octokit, owner, repo, issue_number);
  const updatedSummary = updatedIssue.sub_issues_summary;

  if (updatedSummary && updatedSummary.percent_completed === 100) {
    if (dryRun) {
      if (verbose) {
        console.log(
          `${indent}   ${greenOpen} → ${purpleClosed} ${dim}Would close (all sub-issues complete)${reset}`
        );
      } else {
        console.log(
          `${purpleClosed} ${bold}${issueRef}${reset} ${dim}- "${issue.title}" (would be closed)${reset}`
        );
      }
      totalClosed++;
    } else {
      if (verbose) {
        console.log(
          `${indent}   ${greenOpen} → ${purpleClosed} ${dim}Closing (all sub-issues complete)${reset}`
        );
      } else {
        console.log(
          `${purpleClosed} ${bold}${issueRef}${reset} ${dim}- "${issue.title}" (closed)${reset}`
        );
      }
      await closeIssue(octokit, owner, repo, issue_number, "All sub-issues are now complete");
      totalClosed++;
    }
  } else {
    if (verbose) {
      console.log(
        `${indent}   ${greenOpen} ${dim}Keeping open (${updatedSummary?.completed || 0}/${
          updatedSummary?.total || 0
        } sub-issues complete)${reset}`
      );
    }
  }

  return { processed: totalProcessed, closed: totalClosed };
}

/**
 * Validates non-interactive mode arguments
 * @param {Object} cliArgs - Parsed CLI arguments
 * @returns {string[]} Array of missing required arguments
 */
export function validateNonInteractiveMode(cliArgs) {
  const missing = [];

  if (!cliArgs.token && !process.env.GITHUB_TOKEN) {
    missing.push("token (use -t/--token or set GITHUB_TOKEN environment variable)");
  }
  if (!cliArgs.issue) {
    missing.push("issue (use -i/--issue)");
  }

  return missing;
}
