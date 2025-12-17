import { password } from "@inquirer/prompts";

/**
 * Gets or prompts for GitHub token
 * @returns {Promise<string>} GitHub token
 */
export async function getToken() {
  const envToken = process.env.GITHUB_TOKEN;

  if (envToken) {
    console.log("✓ Using GITHUB_TOKEN from environment");
    return envToken;
  }

  console.log("No GITHUB_TOKEN environment variable found.");
  return await password({
    message: "Please enter your GitHub Personal Access Token:",
    mask: "*",
  });
}
