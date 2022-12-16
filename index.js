const fetch = require("./fetch");
const {
  createGetReleasesPath,
  createDeleteReleasesPath,
  createDeleteTagPath,
  createTagRef,
  getRepoFromEnvironment
} = require("./utils");

if (!process.env.GITHUB_TOKEN) {
  console.error("🔴 no GITHUB_TOKEN found. pass `GITHUB_TOKEN` as env");
  process.exit(1);
}
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const fullyQualifiedRepo = getRepoFromEnvironment()
if (!fullyQualifiedRepo) {
  console.error("🔴 no GITHUB_REPOSITORY found. pass `GITHUB_REPOSITORY` as env or `INPUT_REPO` as an input");
  process.exit(1);
}
console.log(`📕  given repo is "${fullyQualifiedRepo}"`);

if (!process.env.INPUT_TAG_NAME) {
  console.error("🌶  no tag name found. use `tag_name` to pass value");
  process.exit(1);
}
const tagName = process.env.INPUT_TAG_NAME;

const shouldDeleteRelease = process.env.INPUT_DELETE_RELEASE === "true";

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

const tagRef = createTagRef(tagName);

async function deleteTag() {
  try {
    await fetch({
      ...commonOpts,
      path: createDeleteTagPath(tagRef, fullyQualifiedRepo),
      method: "DELETE",
    });

    console.log(`✅  tag "${tagName}" deleted successfully!`);
  } catch (error) {
    console.error(`🌶  failed to delete ref "${tagRef}" <- ${error.message}`);
    if (error.message === "Reference does not exist") {
      console.error("😕  Proceeding anyway, because tag not existing is the goal");
    } else {
      console.error(`🌶  An error occurred while deleting the tag "${tagName}"`);
      process.exit(1)
    }
  }
}

async function deleteReleases() {
  let releaseIds = [];
  try {
    const data = await fetch({
      ...commonOpts,
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: "GET",
    });
    releaseIds = (data || [])
      .filter(({tag_name, draft}) => tag_name === tagName && draft === false)
      .map(({id}) => id);
  } catch (error) {
    console.error(`🌶  failed to get list of releases <- ${error.message}`);
    process.exit(1)
    return;
  }

  if (releaseIds.length === 0) {
    console.error(`😕  no releases found associated to tag "${tagName}"`);
    return;
  }
  console.log(`🍻  found ${releaseIds.length} releases to delete`);

  for (let i = 0; i < releaseIds.length; i++) {
    const releaseId = releaseIds[i];

    try {
      await fetch({
        ...commonOpts,
        path: createDeleteReleasesPath(releaseId, fullyQualifiedRepo),
        method: "DELETE",
      });
    } catch (error) {
      console.error(`🌶  failed to delete release with id "${releaseId}"  <- ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`👍🏼  all releases deleted successfully!`);
}

module.exports = async function run() {
  if (shouldDeleteRelease) {
    await deleteReleases();
  }
  await deleteTag();
}
