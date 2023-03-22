# GitHub Action: Delete tag and release

## Usage
Add following step to your workflow:

```yaml
- uses: dev-drprasad/delete-tag-and-release@v0.2
  with:
    tag_name: v0.1.0 #(required) tag name to delete 
    github_token: ${{ secrets.GITHUB_TOKEN }} # (required) a GitHub token with write access to the repo that needs to be modified
    delete_release: true #(optional) default: true 
    repo: <owner>/<repoName> #(optional) target repository. default: repo running this action
```

## Developing

You can follow these instructions to get this project cloned to your local machine and ready for development. Note that
development requires at least [Node 16](https://nodejs.org/en/download) to be installed on your computer.

```shell
git clone https://github.com/dev-drprasad/delete-tag-and-release.git
cd delete-tag-and-release
npm install
```

Tests can be run via:

```shell
npm test
```

Since this is a repo for a GitHub Action, **every new commit that changes code must include a new bundle.** You can 
generate a new bundle via running:

```shell
npm run package
```

and commiting the resulting changes that will be in the `dist/` folder.

## Releasing
As this repo is a GitHub Action, releases are done via creating a new tag and pushing that tag to the repo. A new
release can be made via the following:

```shell
git checkout master
git fetch
git pull
# choose either patch, minor, or major. See https://docs.npmjs.com/cli/v8/commands/npm-version#description for more info
npm version <patch/minor/major>
git push --follow-tags
```

This will update the version in the `package.json`, create a new commit based off of the master branch, and create a 
new Git tag named the new version that points to that new commit. Remember the `--follow-tags` flag when running 
`git push`! Without it, the new tag won't be pushed.

