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
