# GitHub Sub-Issue Closer

An interactive Node.js CLI tool that recursively closes GitHub sub-issues when they are 100% complete. Uses the GitHub REST API to efficiently manage issue hierarchies.

## Features

- 🔄 **Recursive Processing**: Automatically traverses the entire sub-issue tree
- 🎯 **Smart Closing**: Only closes issues when `sub_issues_summary.percent_completed === 100`
- 🔍 **Dry-Run Mode**: Preview which issues would be closed without making changes
- 🔐 **Flexible Authentication**: Use environment variable or interactive prompt for GitHub token
- 📊 **Progress Tracking**: Visual feedback showing the issue hierarchy as it's processed
- 💬 **Automatic Comments**: Adds a comment when closing issues for transparency

## Installation

### Local Installation

```bash
npm install
```

### Global Installation

```bash
npm install -g .
```

Or install directly from npm (if published):

```bash
npm install -g sub-issue-closer
```

## Usage

### Setting Up Authentication

You can provide your GitHub Personal Access Token in two ways:

#### Option 1: Environment Variable (Recommended)

```bash
export GITHUB_TOKEN='your_github_token_here'
```

#### Option 2: Interactive Prompt

If no environment variable is set, the tool will prompt you to enter your token.

### Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with these permissions:
   - `repo` (Full control of private repositories)
   - Or at minimum: `repo:status`, `public_repo` for public repos

### Running the Tool

#### With Local Installation

```bash
node index.js
```

Or:

```bash
npm start
```

#### With Global Installation

```bash
sub-issue-closer
```

### Example Session

```
🔧 GitHub Sub-Issue Closer

✓ Using GITHUB_TOKEN from environment
✓ Authenticated as: yourusername

? Enter the parent issue (format: owner/repo#123 or full URL): octocat/hello-world#42

📍 Target: octocat/hello-world#42

? Do you want to run in dry-run mode (preview without closing)? Yes

🔍 Running in DRY-RUN mode (no issues will be closed)

🚀 Starting recursive processing...

📋 Processing: octocat/hello-world#42 - "Main Feature"
   State: open
   Sub-issues: 3/3 complete (100%)
  📋 Processing: octocat/hello-world#43 - "Sub-task 1"
     State: closed
     ℹ️  Already closed, skipping
  📋 Processing: octocat/hello-world#44 - "Sub-task 2"
     State: closed
     ℹ️  Already closed, skipping
  📋 Processing: octocat/hello-world#45 - "Sub-task 3"
     State: closed
     ℹ️  Already closed, skipping
   ✓ Would close (all sub-issues complete)

✨ Complete!
   Issues processed: 4
   Issues closed: 1
```

## Input Formats

The tool accepts multiple formats for specifying the parent issue:

- Short format: `owner/repo#123`
- Full URL: `https://github.com/owner/repo/issues/123`

## How It Works

1. **Authentication**: Validates GitHub token
2. **Issue Input**: Accepts parent issue reference
3. **Dry-Run Option**: Lets you preview changes before committing
4. **Recursive Processing**:
   - Fetches the parent issue
   - Checks its `sub_issues_summary`
   - Recursively processes each sub-issue
   - After processing children, re-checks the parent's completion status
   - Closes the parent if `percent_completed === 100`
5. **Reporting**: Shows summary of processed and closed issues

## API Endpoints Used

This tool uses the following GitHub REST API endpoints:

- `GET /repos/{owner}/{repo}/issues/{issue_number}` - Get issue details including sub_issues_summary
- `GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues` - List sub-issues
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}` - Close issues
- `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` - Add closing comment

## Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token with appropriate permissions
- Issues must have sub-issues configured in GitHub

## Dependencies

- `@octokit/rest` - GitHub REST API client
- `@inquirer/prompts` - Interactive command-line prompts

## Error Handling

The tool gracefully handles:

- Invalid authentication
- Missing or inaccessible issues
- Network errors
- User cancellation (Ctrl+C)
- Invalid input formats

## Development

### Project Structure

```
sub-issue-closer/
├── index.js          # Main CLI script
├── package.json      # Package configuration
├── README.md         # This file
└── .gitignore       # Git ignore rules
```

### Making the Script Executable

The script includes a shebang (`#!/usr/bin/env node`) and is marked as executable via the `bin` field in package.json, making it work as a CLI command when installed globally.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
