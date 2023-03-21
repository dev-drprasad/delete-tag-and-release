const {
  createTagRef
} = require("./utils");

const github = require('@actions/github');
const core = require('@actions/core');

/**
 * Logs a message.
 *
 * @param header {string} A header (preferably an emoji representing the "feel" of the message) that should be displayed before
 * the message. This is expected to be a single character.
 * @param message {string} The message to display.
 * @param level {'default' | 'error' | 'warn'} The severity level for this message.
 */
function log(header, message, level = 'default') {
  const loggableMessage = `${header.padEnd(3)}${message}`
  switch (level) {
    case "default":
      core.info(loggableMessage)
      break;
    case "error":
      core.error(loggableMessage)
      break;
    case "warn":
      core.warning(loggableMessage)
      break;

  }
}

/**
 * Deletes a single tag with the name of {@link tagName}.
 * @param octokit {import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").restEndpointMethods}
 * @param owner {string} The owner of the repo with the releases to delete.
 * @param repo {string} The repo with the releases to delete.
 * @param tagName {string}
 * @return {Promise<void>}
 */
async function deleteTag(octokit, {owner, repo}, tagName) {
  try {
    await octokit.rest.git.deleteRef({
      owner,
      repo,
      ref: createTagRef(tagName)
    })

    log("✅", `"${tagName}" deleted successfully!`)
  } catch (error) {
    log("🌶", `failed to delete ref "${tagRef}" <- ${error.message}`, 'error')
    if (error.message === "Reference does not exist") {
      log("😕", "Proceeding anyway, because tag not existing is the goal", 'warn');
    } else {
      log("🌶", `An error occurred while deleting the tag "${tagName}"`, 'error')
      process.exit(1)
    }
  }
}

/**
 * Deletes all releases that are pointed to {@link tagName}.
 *
 * @param octokit {import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").restEndpointMethods}
 * @param owner {string} The owner of the repo with the releases to delete.
 * @param repo {string} The repo with the releases to delete.
 * @param tagName {string} The tag name to delete releases that are based on this tag.
 * @return {Promise<void>}
 */
async function deleteReleases(octokit, {owner, repo}, tagName) {
  /** @type {number[]} **/
  let releaseIds = [];
  try {
    releaseIds = (await octokit.rest.repos.listReleases({
      owner,
      repo
    }) ?? [])
      .filter(({tag_name, draft}) => tag_name === tagName && draft === false)
      .map(({id}) => id);
  } catch (error) {
    log("🌶", `failed to get list of releases <- ${error.message}`, 'error')
    process.exit(1)
    return;
  }

  if (releaseIds.length === 0) {
    log("😕", `no releases found associated to tag "${tagName}"`, 'warn');
    return;
  }
  log("🍻", `found ${releaseIds.length} releases to delete`);

  for (const release_id of releaseIds) {
    try {
      await octokit.rest.repos.deleteRelease({
        release_id
      });
    } catch (error) {
      log("🌶", `failed to delete release with id "${release_id}"  <- ${error.message}`, 'error')
      process.exit(1);
    }
  }

  log("👍🏼", "all releases deleted successfully!");
}

/**
 * Gets the repo information for the repo that this action should operate on. Defaults to the repo running this action
 * if the repo isn't explicitly set via this action's input.
 *
 * @return {{repo: string, owner: string}}
 */
function getRepo() {
  const inputRepoData = core.getInput('repo')
  const [inputOwner, inputRepo] = inputRepoData?.split('/')

  if (inputRepo && inputOwner) {
    return {
      repo: inputRepo,
      owner: inputOwner
    }
  } else if (inputRepo || inputOwner) {
    log('🌶', `a valid repo was not given. Expected "${inputRepoData}" to be in the form of "owner/repo"`)
    process.exit(1)
  } else {
    // This default should only happen when no input repo at all is provided.
    return github.context.repo
  }
}

function getGitHubToken() {
  const tokenFromEnv = process.env.GITHUB_TOKEN
  const inputToken = core.getInput('github_token');

  if (inputToken) {
    return inputToken;
  }

  if (tokenFromEnv) {
    log('⚠️',
      'Providing the GitHub token from the environment variable is deprecated. Provide it as an input with the name "github_token" instead.',
      'warn');
    return tokenFromEnv;
  }

  log('🌶', 'A valid GitHub token was not provided. Provide it as an input with the name "github_token"', 'error');
  process.exit(1)
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
async function getInputs() {
  const tagName = core.getInput('tag_name', {required: true})
  const githubToken = getGitHubToken();
  const shouldDeleteReleases = core.getBooleanInput('delete_release')
  const repo = getRepo();
  const octokit = github.getOctokit(githubToken, {});

  return {
    octokit,
    tagName,
    githubToken,
    shouldDeleteReleases,
    repo
  }
}


/**
 * Runs this action using the provided inputs.
 *
 * @param inputs
 * @param inputs.shouldDeleteReleases {boolean}
 * @param inputs.githubToken {string}
 * @param inputs.repo {repo: string, owner: string}
 * @param inputs.tagName {string}
 * @param inputs.octokit {import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").restEndpointMethods}
 * @return {Promise<void>}
 */
async function run(inputs) {
  const {tagName, githubToken, shouldDeleteReleases, repo, octokit} = inputs

  core.setSecret(githubToken);

  log("🏷", `given tag is "${tagName}"`);
  log("📕", `given repo is "${repo.owner}/${repo.repo}"`);
  log("📕", `delete releases is set to "${shouldDeleteReleases}"`);

  if (shouldDeleteReleases) {
    await deleteReleases(octokit, repo, tagName);
  }
  await deleteTag(octokit, repo, tagName);
}

module.exports = {getInputs, run}
