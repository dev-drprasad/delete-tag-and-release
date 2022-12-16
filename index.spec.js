const {
  createDeleteReleasesPath,
  createDeleteTagPath,
  createGetReleasesPath,
  createTagRef,
  getRepoFromEnvironment
} = require("./utils");

jest.mock('./fetch.js')

describe('Delete tags and releases', () => {
  const defaultArguments = {
    GITHUB_TOKEN: 'a-fake-token',
    INPUT_REPO: 'a-fake-user/a-fake-repo',
    INPUT_TAG_NAME: 'a-fake-tag',
    INPUT_DELETE_RELEASE: false
  }

  const runAction = async () => {
    // Forces Node to re-run `index.js` as if it were a fresh run.
    delete require.cache[require.resolve('./index.js')]
    const run = require('./index.js')
    await run();
  }

  beforeEach(() => {
    process.env = {...defaultArguments}
    jest.spyOn(process, 'exit')
      .mockImplementation(() => {
        throw new Error('Unexpected action exit. Check console.');
      });
  })

  afterEach(() => {
    process.env = undefined
    jest.clearAllMocks();
    jest.resetModules();
  })

  it("does nothing when INPUT_REPO and GITHUB_REPOSITORY aren't set", async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true", INPUT_REPO: undefined, GITHUB_REPOSITORY: undefined}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await expect(runAction()).rejects.toBeTruthy();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("does nothing without an INPUT_TAG_NAME", async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true", INPUT_TAG_NAME: undefined}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await expect(runAction()).rejects.toBeTruthy();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does nothing when without a Github token', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true", GITHUB_TOKEN: undefined}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await expect(runAction()).rejects.toBeTruthy();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('only deletes the tag when INPUT_DELETE_RELEASE is false', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "false"}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment();
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await runAction();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteTagPath(createTagRef(defaultArguments.INPUT_TAG_NAME), fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      // This is a cheat; we know the "DELETE" releases path always contains the "GET" path, so we use that
      // as a regex match here.
      path: expect.stringMatching(createGetReleasesPath(fullyQualifiedRepo))
    }))
  })

  it('only deletes the tag when INPUT_DELETE_RELEASE is undefined', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: undefined}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment()
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await runAction();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteTagPath(createTagRef(defaultArguments.INPUT_TAG_NAME), fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      // This is a cheat; we know the "DELETE" releases path always contains the "GET" path, so we use that
      // as a regex match here.
      path: expect.stringMatching(createGetReleasesPath(fullyQualifiedRepo))
    }))
  })

  it('fallbacks to GITHUB_REPOSITORY when INPUT_REPO is not set', async () => {
    process.env = {
      ...process.env,
      INPUT_DELETE_RELEASE: "false",
      INPUT_REPO: undefined,
      GITHUB_REPOSITORY: 'a-different-fake/fake-repo'
    }
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {error: false},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment();
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await runAction();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteTagPath(createTagRef(defaultArguments.INPUT_TAG_NAME), fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: expect.stringMatching(createGetReleasesPath(fullyQualifiedRepo))
    }))
  })

  it('does delete multiple releases and the tag when INPUT_DELETE_RELEASE is true', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true"}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {
        result: [
          {tag_name: defaultArguments.INPUT_TAG_NAME, draft: false, id: '1'},
          {tag_name: defaultArguments.INPUT_TAG_NAME, draft: false, id: '2'},
          {tag_name: 'no-delete', draft: false, id: '3'}
        ]
      },
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment();
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await runAction();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteTagPath(createTagRef(process.env.INPUT_TAG_NAME), fullyQualifiedRepo)
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('1', fullyQualifiedRepo)
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('2', fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('3', fullyQualifiedRepo)
    }))
  })

  it('does not delete a draft release', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true"}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {result: [{tag_name: defaultArguments.INPUT_TAG_NAME, draft: true, id: '1'},]},
      DELETE_RELEASE: {error: false},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment();
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await runAction();

    expect(process.env).toEqual(originalProcessEnv)
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteTagPath(createTagRef(process.env.INPUT_TAG_NAME), fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('1', fullyQualifiedRepo)
    }))
  })

  it('stops deleting releases when one fails to delete', async () => {
    process.env = {...process.env, INPUT_DELETE_RELEASE: "true"}
    const originalProcessEnv = {...process.env}
    const mockFetch = createMockFetch({
      GET_RELEASES: {
        result: [
          {tag_name: defaultArguments.INPUT_TAG_NAME, draft: false, id: '1'},
          {tag_name: defaultArguments.INPUT_TAG_NAME, draft: false, id: '2'}
        ]
      },
      DELETE_RELEASE: {'1': {error: true}},
      DELETE_TAG: {error: false}
    })
    const fullyQualifiedRepo = getRepoFromEnvironment()
    jest.requireMock('./fetch.js').mockImplementation(mockFetch)

    await expect(runAction()).rejects.toBeTruthy();

    expect(process.env).toEqual(originalProcessEnv);
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      path: createGetReleasesPath(fullyQualifiedRepo),
      method: 'GET'
    }))
    expect(mockFetch).toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('1', fullyQualifiedRepo)
    }))
    expect(mockFetch).not.toBeCalledWith(expect.objectContaining({
      method: 'DELETE',
      path: createDeleteReleasesPath('2', fullyQualifiedRepo)
    }))
  })

  const createMockFetch = (options) => {
    const fullyQualifiedRepo = getRepoFromEnvironment();
    const releaseIdFromPath = (path) => path.split('/')[5]
    const isDeleteReleasesMatch = (path, method) => {
      if (method !== 'DELETE') return false
      if (options.DELETE_RELEASE.error !== undefined) {
        return path.startsWith(createGetReleasesPath(fullyQualifiedRepo));
      }
      const declaredReleases = Object.keys(options.DELETE_RELEASE) ?? [];
      for (const releaseId of declaredReleases) {
        if (path === createDeleteReleasesPath(releaseId, fullyQualifiedRepo) && options.DELETE_RELEASE[releaseId] !== undefined) {
          return true;
        }
      }
      return false;
    }

    return jest.fn(async ({path, method}) => {
      if (path === createGetReleasesPath(fullyQualifiedRepo) && method === "GET") {
        if (options.GET_RELEASES.result !== undefined) {
          return options.GET_RELEASES.result
        } else {
          throw new Error(options.GET_RELEASES.error ?? 'Generic network error')
        }
      }
      if (isDeleteReleasesMatch(path, method)) {
        if (options.DELETE_RELEASE?.error || options.DELETE_RELEASE[releaseIdFromPath(path)]?.error) {
          throw new Error(options.DELETE_RELEASE?.error ?? options.DELETE_RELEASE[releaseIdFromPath(path)].error)
        } else {
          return undefined
        }
      }
      if (path === createDeleteTagPath(createTagRef(process.env.INPUT_TAG_NAME), fullyQualifiedRepo) && method === "DELETE") {
        if (options.DELETE_RELEASE.error) {
          throw new Error(options.DELETE_RELEASE.error)
        } else {
          return undefined
        }
      }
      throw new Error(`Unexpected request: ${method} ${path}`)
    })
  }
})