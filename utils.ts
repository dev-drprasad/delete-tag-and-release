/**
 * Given the name of a tag, creates a Git reference for the tag.
 * @param tagName The name of the tag to create the reference for.
 */
export const createTagRef = (tagName: string) => `refs/tags/${tagName}`