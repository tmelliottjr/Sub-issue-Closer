/**
 * Displays help information
 */
export function showHelp() {
  console.log(`
🔧 GitHub Sub-Issue Closer

A CLI tool to recursively close GitHub sub-issues when they are 100% complete.

USAGE:
  node index.js [options]
  sub-issue-closer [options]    (if installed globally)

OPTIONS:
  -i, --issue <issue>           Issue reference (owner/repo#123 or URL)
  -t, --token <token>           GitHub Personal Access Token
  -d, --dry-run                 Run in dry-run mode (preview only)
  -l, --live                    Run in live mode (close issues)
  -v, --verbose                 Show detailed output (default: minimal)
  -y, --yes                     Non-interactive mode (for CI/CD)
  -h, --help                    Show this help message

HELP:
  node index.js help
  node index.js --help
  node index.js -h

AUTHENTICATION:
  Set your GitHub Personal Access Token in one of two ways:
  
  1. Environment Variable (recommended):
     export GITHUB_TOKEN='your_token_here'
     
  2. Interactive Prompt:
     The tool will prompt you if GITHUB_TOKEN is not set

  Token Requirements:
  - repo (Full control of private repositories)
  - Or minimum: repo:status, public_repo for public repos

ISSUE INPUT FORMATS:
  - Short format: owner/repo#123
  - Full URL: https://github.com/owner/repo/issues/123

FEATURES:
  ✓ Recursive processing of entire sub-issue trees
  ✓ Smart completion detection using sub_issues_summary
  ✓ Dry-run mode for safe previewing (default)
  ✓ Cross-repository sub-issue support
  ✓ Automatic comment when closing issues
  ✓ Visual progress tracking with GitHub-style indicators
Interactive mode (prompts for all inputs)
  node index.js
  
  # With CLI arguments
  node index.js --issue owner/repo#123 --dry-run
  
  # Live mode with all arguments
  node index.js -i owner/repo#456 -t ghp_token123 --live
  
  # Using environment variable for token
  export GITHUB_TOKEN='ghp_...'
  node index.js -i owner/repo#789 -d
EXAMPLES:
  # Interactive mode
  node index.js
  
  # With all CLI arguments
  node index.js -i owner/repo#123 -t ghp_token --dry-run
  
  # Non-interactive mode (for CI/CD)
  node index.js -y -i owner/repo#123 --live
  
  # Using environment variable
  export GITHUB_TOKEN='ghp_...'
  node index.js -y -i owner/repo#789 -d

DOCUMENTATION:
  See README.md for detailed usage and installation instructions
`);
}
