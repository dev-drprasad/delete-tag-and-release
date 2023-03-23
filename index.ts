import { createTagRef } from "./utils";
import { context, getOctokit } from "@actions/github";
import {
  error,
  getBooleanInput,
  getInput,
  info,
  setSecret,
  warning,
} from "@actions/core";

export type Octokit = ReturnType<typeof getOctokit>;

interface QualifiedRepo {
  owner: string;
  repo: string;
}

export interface WorkflowInput {
  githubToken: string;
  shouldDeleteReleases: boolean;
  repo: QualifiedRepo;
  tagName: string;
  octokit: Octokit;
}

/**
 * Logs a message.
 *
 * @param header A header (preferably an emoji representing the "feel" of the message) that should be displayed before
 * the message. This is expected to be a single character.
 * @param message The message to display.
 * @param level  The severity level for this message.
 */
function log(
  header: string,
  message: string,
  level: "default" | "error" | "warn" = "default"
): void {
  const loggableMessage = `${header.padEnd(3)}${message}`;
  switch (level) {
    case "default":
      info(loggableMessage);
      break;
    case "error":
      error(loggableMessage);
      break;
    case "warn":
      warning(loggableMessage);
      break;
  }
}

/**
 * Deletes a single tag with the name of {@link tagName}.
 * @param octokit The Octokit instance to use for making API calls to GitHub.
 * @param owner The owner of the repo with the releases to delete.
 * @param repo The repo with the releases to delete.
 * @param tagName
 */
async function deleteTag(
  octokit: Octokit,
  { owner, repo }: QualifiedRepo,
  tagName: string
): Promise<void> {
  const ref = createTagRef(tagName);
  try {
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref,
    });

    log("✅", `"${tagName}" deleted successfully!`);
  } catch (error) {
    if (error instanceof Error) {
      log("🌶", `failed to delete ref "${ref}" <- ${error.message}`, "error");
      if (error.message === "Reference does not exist") {
        log(
          "😕",
          "Proceeding anyway, because tag not existing is the goal",
          "warn"
        );
      } else {
        log(
          "🌶",
          `An error occurred while deleting the tag "${tagName}"`,
          "error"
        );
        process.exit(1);
      }
    } else {
      log(
        "🌶",
        `An error occurred while deleting the tag "${tagName}"`,
        "error"
      );
      process.exit(1);
    }
  }
}

/**
 * Deletes all releases that are pointed to {@link tagName}.
 *
 * @param octokit The Octokit instance to use for making API calls to GitHub.
 * @param qualifiedRepo The fully qualified repo to delete releases for.
 * @param tagName The tag name to delete releases that are based on this tag.
 */
async function deleteReleases(
  octokit: Octokit,
  qualifiedRepo: QualifiedRepo,
  tagName: string
): Promise<void> {
  let releaseIds: number[] = [];
  try {
    const releases = await octokit.rest.repos.listReleases({
      repo: qualifiedRepo.repo,
      owner: qualifiedRepo.owner,
    });
    releaseIds = (releases.data ?? [])
      .filter(({ tag_name, draft }) => tag_name === tagName && !draft)
      .map(({ id }) => id);
  } catch (error) {
    if (error instanceof Error) {
      log("🌶", `failed to get list of releases <- ${error.message}`, "error");
    } else {
      log("🌶", `failed to get list of releases <- ${error}`, "error");
    }
    process.exit(1);
    return;
  }

  if (releaseIds.length === 0) {
    log("😕", `no releases found associated to tag "${tagName}"`, "warn");
    return;
  }
  log("🍻", `found ${releaseIds.length} releases to delete`);

  for (const release_id of releaseIds) {
    try {
      await octokit.rest.repos.deleteRelease({
        release_id,
        ...qualifiedRepo,
      });
    } catch (error) {
      if (error instanceof Error) {
        log(
          "🌶",
          `failed to delete release with id "${release_id}"  <- ${error.message}`,
          "error"
        );
      } else {
        log(
          "🌶",
          `failed to delete release with id "${release_id}"  <- ${error}`,
          "error"
        );
      }
      process.exit(1);
    }
  }

  log("👍🏼", "all releases deleted successfully!");
}

/**
 * Gets the repo information for the repo that this action should operate on. Defaults to the repo running this action
 * if the repo isn't explicitly set via this action's input.
 */
function getRepo(): QualifiedRepo {
  const inputRepoData = getInput("repo");
  const [inputOwner, inputRepo] = inputRepoData?.split("/");

  if (inputRepo && inputOwner) {
    return {
      repo: inputRepo,
      owner: inputOwner,
    };
  } else if (inputRepo || inputOwner) {
    log(
      "🌶",
      `a valid repo was not given. Expected "${inputRepoData}" to be in the form of "owner/repo"`
    );
    process.exit(1);
  } else {
    // This default should only happen when no input repo at all is provided.
    return context.repo;
  }
}

function getGitHubToken(): string {
  const tokenFromEnv = process.env.GITHUB_TOKEN;
  const inputToken = getInput("github_token");

  if (inputToken) {
    return inputToken;
  }

  if (tokenFromEnv != null) {
    log(
      "⚠️",
      'Providing the GitHub token from the environment variable is deprecated. Provide it as an input with the name "github_token" instead.',
      "warn"
    );
    return tokenFromEnv;
  }

  log(
    "🌶",
    'A valid GitHub token was not provided. Provide it as an input with the name "github_token"',
    "error"
  );
  process.exit(1);
}

function getShouldDeleteReleases(): boolean {
  const deleteReleaseInputKey = "delete_release";
  const hasDeleteReleaseInput = !!getInput(deleteReleaseInputKey);

  if (hasDeleteReleaseInput) {
    // This will throw if it's not provided, so we have to wrap it in a check to make
    // sure it exists first, since it's an optional field.
    return getBooleanInput(deleteReleaseInputKey);
  }
  return false;
}

/**
 * Gets the inputs for this action.
 *
 * @return {Promise<{shouldDeleteReleases: boolean,
 * githubToken: string,
 * repo: {repo: string, owner: string},
 * tagName: string,
 * octokit: import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").restEndpointMethods}>}
 */
export function getInputs(): WorkflowInput {
  const tagName = getInput("tag_name");
  const githubToken = getGitHubToken();
  const shouldDeleteReleases = getShouldDeleteReleases();
  const repo = getRepo();
  const octokit = getOctokit(githubToken);

  return {
    octokit,
    tagName,
    githubToken,
    shouldDeleteReleases,
    repo,
  };
}

function validateInputField(isValid: any, invalidMessage: string): void {
  if (!isValid) {
    log("🌶", invalidMessage, "error");
    process.exit(1);
  }
}

/**
 * Runs this action using the provided inputs.
 */
export async function run(inputs: WorkflowInput): Promise<void> {
  const { tagName, githubToken, shouldDeleteReleases, repo, octokit } = inputs;

  setSecret(githubToken);

  // Purposefully perform these checks even though the types match because it's possible the inputs were provided
  // directly as environment variables
  validateInputField(tagName, "no tag name provided as an input.");
  validateInputField(githubToken, "no Github token provided");
  validateInputField(
    typeof shouldDeleteReleases === "boolean",
    `an invalid value for shouldDeleteReleases was provided: ${shouldDeleteReleases}`
  );
  validateInputField(
    repo?.owner && repo?.repo,
    "An invalid repo was provided!"
  );

  log("🏷", `given tag is "${tagName}"`);
  log("📕", `given repo is "${repo.owner}/${repo.repo}"`);
  log("📕", `delete releases is set to "${shouldDeleteReleases}"`);

  if (shouldDeleteReleases) {
    await deleteReleases(octokit, repo, tagName);
  }
  await deleteTag(octokit, repo, tagName);
}
