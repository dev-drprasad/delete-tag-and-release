const fetch = require("./fetch");

if (!process.env.GITHUB_TOKEN) {
  console.error("🔴 no GITHUB_TOKEN found. pass `GITHUB_TOKEN` as env");
  process.exitCode = 1;
  return;
}
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

let owner, repo;

if (process.env.INPUT_REPO) {
  [owner, repo] = process.env.INPUT_REPO.split("/");
} else if (process.env.GITHUB_REPOSITORY) {
  [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
} else {
  console.error("🔴 no GITHUB_REPOSITORY found. pass `GITHUB_REPOSITORY` as env or owner/repo as inputs");
  process.exitCode = 1;
  return;
}
console.log(`📕  given repo is "${owner}/${repo}"`);

if (!process.env.INPUT_TAG_NAME) {
  console.error("🌶  no tag name found. use `tag_name` to pass value");
  process.exitCode = 1;
  return;
}
const tagName = process.env.INPUT_TAG_NAME;

const shouldDeleteRelease = process.env.INPUT_DELETE_RELEASE === "true";
const shouldDeleteDraftRelease = process.env.INPUT_DELETE_DRAFT_RELEASE === "true";

const commonOpts = {
  host: "api.github.com",
  port: 443,
  protocol: "https:",
  auth: `user:${GITHUB_TOKEN}`,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "node.js",
  },
};

console.log(`🏷  given tag is "${tagName}"`);

const tagRef = `refs/tags/${tagName}`;

async function deleteTag() {
  try {
    const _ = await fetch({
      ...commonOpts,
      path: `/repos/${owner}/${repo}/git/${tagRef}`,
      method: "DELETE",
    });

    console.log(`✅  tag "${tagName}" deleted successfully!`);
  } catch (error) {
    console.error(`🌶  failed to delete ref "${tagRef}" <- ${error.message}`);
    if (error.message === "Reference does not exist") {
      console.error("😕  Proceeding anyway, because tag not existing is the goal");
    } else {
      console.error(`🌶  An error occured while deleting the tag "${tagName}"`);
      process.exitCode = 1;
    }
    return;
  }
}

async function deleteReleases() {
  let releaseIds = [];
  try {
    const data = await fetch({
      ...commonOpts,
      path: `/repos/${owner}/${repo}/releases`,
      method: "GET",
    });
    releaseIds = (data || [])
      .filter(({ tag_name, draft }) => tag_name === tagName && shouldDeleteDraftRelease ? true : (draft === false))
      .map(({ id }) => id);
  } catch (error) {
    console.error(`🌶  failed to get list of releases <- ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (releaseIds.length === 0) {
    console.error(`😕  no releases found associated to tag "${tagName}"`);
    return;
  }
  console.log(`🍻  found ${releaseIds.length} releases to delete`);

  let hasError = false;
  for (let i = 0; i < releaseIds.length; i++) {
    const releaseId = releaseIds[i];

    try {
      const _ = await fetch({
        ...commonOpts,
        path: `/repos/${owner}/${repo}/releases/${releaseId}`,
        method: "DELETE",
      });
    } catch (error) {
      console.error(`🌶  failed to delete release with id "${releaseId}"  <- ${error.message}`);
      hasError = true;
      break;
    }
  }

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.log(`👍🏼  all releases deleted successfully!`);
}

async function run() {
  if (shouldDeleteRelease) {
    await deleteReleases();
  }
  await deleteTag();
}

run();
