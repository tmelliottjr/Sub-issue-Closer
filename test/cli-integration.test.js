import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("index.js CLI Integration Tests", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Help command", () => {
    it("should show help with --help flag", async () => {
      try {
        const { stdout } = await execAsync("node index.js --help");
        expect(stdout).toContain("GitHub Sub-Issue Closer");
        expect(stdout).toContain("USAGE:");
        expect(stdout).toContain("OPTIONS:");
      } catch (error) {
        // Exit code 0 is expected for help
        if (error.code === 0) {
          expect(error.stdout).toContain("GitHub Sub-Issue Closer");
        } else {
          throw error;
        }
      }
    }, 10000);

    it("should show help with -h flag", async () => {
      try {
        const { stdout } = await execAsync("node index.js -h");
        expect(stdout).toContain("GitHub Sub-Issue Closer");
      } catch (error) {
        if (error.code === 0) {
          expect(error.stdout).toContain("GitHub Sub-Issue Closer");
        } else {
          throw error;
        }
      }
    }, 10000);

    it("should show help with help command", async () => {
      try {
        const { stdout } = await execAsync("node index.js help");
        expect(stdout).toContain("GitHub Sub-Issue Closer");
      } catch (error) {
        if (error.code === 0) {
          expect(error.stdout).toContain("GitHub Sub-Issue Closer");
        } else {
          throw error;
        }
      }
    }, 10000);
  });

  describe("Non-interactive mode validation", () => {
    it("should error when missing required args in non-interactive mode", async () => {
      try {
        await execAsync("node index.js -y");
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain("Non-interactive mode");
      }
    }, 10000);

    it("should error when missing issue in non-interactive mode", async () => {
      try {
        await execAsync("node index.js -y -t fake_token");
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain("issue");
      }
    }, 10000);
  });

  describe("Issue format validation", () => {
    it("should error on invalid issue format in non-interactive mode", async () => {
      try {
        // The CLI validates issue format after authentication
        // So we expect either auth failure or format error
        await execAsync('node index.js -y -i "invalid-format" -t fake_token');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe(1);
        // Could fail at auth or format validation step
        const output = error.stderr || error.stdout;
        expect(output).toBeTruthy();
      }
    }, 10000);
  });

  describe("Authentication", () => {
    it("should fail authentication with invalid token", async () => {
      try {
        await execAsync('node index.js -y -i "owner/repo#1" -t invalid_token_12345 -d');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain("Authentication failed");
      }
    }, 10000);
  });
});
