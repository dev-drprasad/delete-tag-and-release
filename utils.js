/**
 * Fetch the fully qualified repository from the environment variables.
 *
 * A fully qualified repository is a unique identifier for a repo on GitHub, which is the owning user's name followed by
 * the repository name in the form of: `owner/repo`
 *
 * @return {string}
 */
const getRepoFromEnvironment = () => process.env['INPUT_REPO'] ?? process.env['GITHUB_REPOSITORY']

/**
 * Create the path that can be combined with the base GitHub API url to fetch the releases for a repository.
 *
 * @param fullyQualifiedRepo {`{owner}/{repo}`} The fully qualified name of the repo
 * @return {`/repos/${string}/releases`}
 */
const createGetReleasesPath = (fullyQualifiedRepo) => `/repos/${fullyQualifiedRepo}/releases`

// The fact that this uses the "createGetReleasesPath" is used in a test, so changes here should be reflected there as
// well.
/**
 * Create the path that can be combined with the base GitHub API url to delete a single release by ID for a repository.
 *
 * @param releaseId {string} The GitHub ID for the release
 * @param fullyQualifiedRepo {string} The fully qualified name of the repo
 * @see getRepoFromEnvironment
 * @return {`/repos/${string}/releases/${string}`}
 */
const createDeleteReleasePath = (releaseId, fullyQualifiedRepo) => `${createGetReleasesPath(fullyQualifiedRepo)}/${releaseId}`

/**
 * Create the path that can be combined with the base GitHub API url to delete a single tag by its reference for a
 * repository.
 *
 * @param tagRef {string} The reference for a tag.
 * @param fullyQualifiedRepo {string} The fully qualified name of the repo
 * @see getRepoFromEnvironment
 * @see createTagRef
 * @return {`/repos/${string}/git/${string}`}
 */
const createDeleteTagPath = (tagRef, fullyQualifiedRepo) => `/repos/${fullyQualifiedRepo}/git/${tagRef}`

/**
 * Given the name of a tag, creates a Git reference for the tag.
 * @param tagName {string} The name of the tag to create the reference for.
 * @return {`refs/tags/${string}`}
 */
const createTagRef = (tagName) => `refs/tags/${tagName}`

module.exports = {
  getRepoFromEnvironment,
  createGetReleasesPath,
  createDeleteReleasesPath: createDeleteReleasePath,
  createDeleteTagPath,
  createTagRef
}