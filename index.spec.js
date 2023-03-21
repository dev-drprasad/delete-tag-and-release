describe('Delete tags and releases', () => {
  describe('Input validation tests', () => {
    const defaultEnvironment = {
      INPUT_DELETE_RELEASE: "false",
      INPUT_REPO: 'a-fake-user/fake-repo',
      INPUT_GITHUB_TOKEN: 'token',
      INPUT_TAG_NAME: 'a-tag'
    }
    const getInputs = () => {
      // Forces Node to re-run `index.js` as if it were a fresh run.
      delete require.cache[require.resolve('./index.js')]
      const {getInputs} = require('./index.js')
      return getInputs();
    }

    it('fallbacks to GITHUB_REPOSITORY when INPUT_REPO is not set', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_REPO: undefined,
        GITHUB_REPOSITORY: 'a-different-fake/fake-repo',
      }

      const expected = {
        repo: {
          owner: 'a-different-fake',
          repo: 'fake-repo'
        }
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })

    it('ignores GITHUB_REPOSITORY when INPUT_REPO is set', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        GITHUB_REPOSITORY: 'a-different-fake/fake-repo',
      }

      const expected = {
        repo: {
          owner: 'a-fake-user',
          repo: 'fake-repo'
        }
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })

    it('ignores the token from env if set as input', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        GITHUB_TOKEN: 'an-env-token',
      }

      const expected = {
        githubToken: 'token'
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })

    it('uses the token from env if not set as input', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_GITHUB_TOKEN: undefined,
        GITHUB_TOKEN: 'an-env-token',
      }

      const expected = {
        githubToken: 'an-env-token'
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })

    it('sets should delete releases when its set', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_DELETE_RELEASE: 'true',
      }

      const expected = {
        shouldDeleteReleases: true
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })

    it('sets should delete releases to false when its not set', async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_DELETE_RELEASE: undefined,
      }

      const expected = {
        shouldDeleteReleases: false
      }
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected))
    })
  })

  describe('Action tests', () => {
    const defaultArguments = {
      githubToken: 'a-fake-token',
      repo: {owner: 'a-fake-user', repo: 'a-fake-repo'},
      tagName: 'a-fake-tag',
      shouldDeleteReleases: true
    }

    /**
     * Runs the action using the provided inputs.
     *
     * @param inputs
     * @param inputs.shouldDeleteReleases {boolean}
     * @param inputs.githubToken {string}
     * @param inputs.repo {repo: string, owner: string}
     * @param inputs.tagName {string}
     * @param inputs.octokit {import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").restEndpointMethods}
     * @return {Promise<void>}
     */
    const runAction = async (inputs) => {
      // Forces Node to re-run `index.js` as if it were a fresh run.
      delete require.cache[require.resolve('./index.js')]
      const {run} = require('./index.js')
      await run(inputs);
    }

    beforeEach(() => {
      jest.spyOn(process, 'exit')
        .mockImplementation(() => {
          throw new Error('Unexpected action exit. Check console.');
        });
    })

    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    })

    it("does nothing when repo isn't provided", async () => {
      const octokit = jest.fn()
      const inputs = {
        ...defaultArguments,
        repo: undefined,
        octokit
      }
      await expect(runAction(inputs)).rejects.toBeTruthy();
    })

    it("does nothing without an tagName input", async () => {
      const octokit = jest.fn()
      const inputs = {
        ...defaultArguments,
        tagName: undefined,
        octokit
      }
      await expect(runAction(inputs)).rejects.toBeTruthy();
    })

    it('does nothing when without a Github token', async () => {
      const octokit = jest.fn()
      const inputs = {
        ...defaultArguments,
        githubToken: undefined,
        octokit
      }
      await expect(runAction(inputs)).rejects.toBeTruthy();
    })

    it('does nothing when shouldDeleteRelease is undefined', async () => {
      const octokit = jest.fn()
      const inputs = {
        ...defaultArguments,
        shouldDeleteReleases: undefined,
        octokit
      }
      await expect(runAction(inputs)).rejects.toBeTruthy();
    })

    it('only deletes the tag when INPUT_DELETE_RELEASE is false', async () => {
      const deleteRef = jest.fn()
      const octokit = {
        rest: {
          git: {
            deleteRef
          }
        }
      }
      const inputs = {
        ...defaultArguments,
        shouldDeleteReleases: false,
        octokit
      }

      await runAction(inputs);

      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: 'a-fake-user',
        repo: 'a-fake-repo',
        ref: 'refs/tags/a-fake-tag'
      })
    })

    it('does delete multiple releases and the tag when INPUT_DELETE_RELEASE is true', async () => {
      const deleteRef = jest.fn()
      const listReleases = jest.fn()
      const deleteRelease = jest.fn()
      const octokit = {
        rest: {
          git: {
            deleteRef
          },
          repos: {
            listReleases, deleteRelease
          }
        }
      }
      const inputs = {
        ...defaultArguments,
        octokit
      }

      listReleases.mockReturnValueOnce([
          {tag_name: defaultArguments.tagName, draft: false, id: '1'},
          {tag_name: defaultArguments.tagName, draft: false, id: '2'},
          {tag_name: 'no-delete', draft: false, id: '3'}
        ]
      )

      await runAction(inputs);

      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: 'a-fake-user',
        repo: 'a-fake-repo',
        ref: 'refs/tags/a-fake-tag'
      })
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo
      })
      expect(deleteRelease).toHaveBeenCalledTimes(2);
      expect(deleteRelease).toHaveBeenCalledWith({
        release_id: '1'
      })
      expect(deleteRelease).toHaveBeenCalledWith({
        release_id: '2'
      })
      expect(deleteRelease).not.toHaveBeenCalledWith({
        release_id: 'no-delete'
      })
    })

    it('does not delete a draft release', async () => {
      const deleteRef = jest.fn()
      const listReleases = jest.fn()
      const deleteRelease = jest.fn()
      const octokit = {
        rest: {
          git: {
            deleteRef
          },
          repos: {
            listReleases, deleteRelease
          }
        }
      }
      const inputs = {
        ...defaultArguments,
        octokit
      }

      listReleases.mockReturnValueOnce([
          {tag_name: defaultArguments.tagName, draft: true, id: '1'},
        ]
      )

      await runAction(inputs);


      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: 'a-fake-user',
        repo: 'a-fake-repo',
        ref: 'refs/tags/a-fake-tag'
      })
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo
      })
      expect(deleteRelease).not.toHaveBeenCalled();
    })

    it('stops deleting releases when one fails to delete', async () => {
      const deleteRef = jest.fn()
      const listReleases = jest.fn()
      const deleteRelease = jest.fn()
      const octokit = {
        rest: {
          git: {
            deleteRef
          },
          repos: {
            listReleases, deleteRelease
          }
        }
      }
      const inputs = {
        ...defaultArguments,
        octokit
      }

      listReleases.mockReturnValueOnce([
          {tag_name: defaultArguments.tagName, draft: false, id: '1'},
          {tag_name: defaultArguments.tagName, draft: false, id: '2'},
          {tag_name: defaultArguments.tagName, draft: false, id: '3'},
        ]
      )
      deleteRelease.mockImplementation(({release_id}) => {
        if (release_id === '1') {
          return Promise.reject(new Error("Something bad happened!"))
        }
      })


      await expect(runAction(inputs)).rejects.toBeTruthy();


      expect(deleteRef).not.toHaveBeenCalled()
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo
      })
      expect(deleteRelease).toHaveBeenCalledWith({
        release_id: '1'
      });
      expect(deleteRelease).not.toHaveBeenCalledWith({
        release_id: '2'
      });
    })
  })
});