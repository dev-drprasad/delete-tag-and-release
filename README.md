# GitHub Action: Delete tag and release

Add following step to your workflow:

```yaml
- uses: dev-drprasad/delete-tag-and-release@v0.2.0
  with:
    delete_release: true # default: true
    delete_draft_release: true # default: false; only applicable if delete_release == true
    tag_name: v0.1.0 # tag name to delete
    repo: <owner>/<repoName> # target repo (optional). defaults to repo running this action
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
