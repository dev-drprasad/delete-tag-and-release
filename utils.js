/**
 * Given the name of a tag, creates a Git reference for the tag.
 * @param tagName {string} The name of the tag to create the reference for.
 * @return {`refs/tags/${string}`}
 */
const createTagRef = (tagName) => `refs/tags/${tagName}`

module.exports = {
  createTagRef
}