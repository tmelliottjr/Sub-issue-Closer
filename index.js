#!/usr/bin/env node

import { Octokit } from "@octokit/rest";
import { input, confirm } from "@inquirer/prompts";
import { getToken } from "./lib/auth.js";
import { showHelp } from "./lib/help.js";
import {
  parseIssueInput,
  parseArgs,
  processIssueRecursively,
  validateNonInteractiveMode,
} from "./lib/core.js";

/**
 * Main function
 */
async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);

  // Check for help flags
  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const cliArgs = parseArgs(args);

  console.log("🔧 GitHub Sub-Issue Closer\n");

  // Validate non-interactive mode
  if (cliArgs.nonInteractive) {
    const missing = validateNonInteractiveMode(cliArgs);

    if (cliArgs.dryRun === null) {
      // Default to dry-run in non-interactive mode if not specified
      cliArgs.dryRun = true;
    }

    if (missing.length > 0) {
      console.error("✗ Non-interactive mode (-y) requires the following arguments:\n");
      missing.forEach((arg) => console.error(`  - ${arg}`));
      console.error("\nExample: node index.js -y -i owner/repo#123 -t ghp_token --dry-run");
      process.exit(1);
    }
  }

  try {
    // Get authentication token
    const token = cliArgs.token || (await getToken());
    const octokit = new Octokit({ auth: token });

    // Verify authentication
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      console.log(`✓ Authenticated as: ${user.login}\n`);
    } catch (error) {
      console.error("✗ Authentication failed. Please check your token.");
      process.exit(1);
    }

    // Get parent issue
    let issueInput = cliArgs.issue;

    if (!issueInput) {
      if (cliArgs.nonInteractive) {
        console.error("✗ Issue is required in non-interactive mode. Use -i/--issue");
        process.exit(1);
      }
      issueInput = await input({
        message: "Enter the parent issue (format: owner/repo#123 or full URL):",
        validate: (value) => {
          if (!parseIssueInput(value)) {
            return "Invalid format. Use owner/repo#123 or https://github.com/owner/repo/issues/123";
          }
          return true;
        },
      });
    }

    const issueInfo = parseIssueInput(issueInput);

    if (!issueInfo) {
      console.error(
        "✗ Invalid issue format. Use owner/repo#123 or https://github.com/owner/repo/issues/123"
      );
      process.exit(1);
    }

    console.log(`\n📍 Target: ${issueInfo.owner}/${issueInfo.repo}#${issueInfo.issue_number}\n`);

    // Dry run option
    let dryRun = cliArgs.dryRun;

    if (dryRun === null) {
      if (cliArgs.nonInteractive) {
        dryRun = true; // Default to dry-run in non-interactive mode
      } else {
        dryRun = await confirm({
          message: "Do you want to run in dry-run mode (preview without closing)?",
          default: true,
        });
      }
    }

    if (dryRun) {
      console.log("\n🔍 Running in DRY-RUN mode (no issues will be closed)\n");
    } else {
      console.log("\n⚠️  LIVE MODE - Issues will be closed!\n");

      if (!cliArgs.nonInteractive) {
        const confirmAction = await confirm({
          message: "Are you sure you want to proceed?",
          default: false,
        });

        if (!confirmAction) {
          console.log("Operation cancelled.");
          process.exit(0);
        }
      }
    }

    if (cliArgs.verbose) {
      console.log("\n🚀 Starting recursive processing...\n");
    } else {
      console.log("\n🚀 Processing...\n");
    }

    // Process the issue tree
    const result = await processIssueRecursively(
      octokit,
      issueInfo.owner,
      issueInfo.repo,
      issueInfo.issue_number,
      0,
      dryRun,
      cliArgs.verbose
    );

    console.log("\n✨ Complete!");
    console.log(`   Issues processed: ${result.processed}`);
    if (dryRun) {
      console.log(`   Issues that would be closed: ${result.closed}`);
    } else {
      console.log(`   Issues closed: ${result.closed}`);
    }
  } catch (error) {
    if (error.name === "ExitPromptError") {
      console.log("\n👋 Cancelled by user");
      process.exit(0);
    }

    console.error("\n❌ Error:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Details:", error.response.data?.message || "No additional details");
    }
    process.exit(1);
  }
}

// Run the CLI
main();
