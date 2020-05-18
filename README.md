# GitHub Action: Delete tag and release

Add following step to your workflow:

```yaml
- uses: dev-drprasad/delete-tag-and-release@v0.1.2
  with:
    delete_release: true # default: false
    tag_name: v0.1.0 # tag name to delete
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
