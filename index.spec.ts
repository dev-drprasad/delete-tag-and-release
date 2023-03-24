import { type WorkflowInput, type Octokit } from "./index";
import {
  expect,
  jest,
  describe,
  it,
  beforeEach,
  afterEach,
} from "@jest/globals";

describe("Delete tags and releases", () => {
  describe("Input validation tests", () => {
    const defaultEnvironment = {
      INPUT_DELETE_RELEASE: "false",
      INPUT_REPO: "a-fake-user/fake-repo",
      INPUT_GITHUB_TOKEN: "token",
      INPUT_TAG_NAME: "a-tag",
    };
    const getInputs = (): WorkflowInput => {
      // Forces Node to re-run `index.ts` as if it were a fresh run.
      delete require.cache[require.resolve("./index.ts")];
      const { getInputs } = require("./index.ts");
      return getInputs();
    };

    it("fallbacks to GITHUB_REPOSITORY when INPUT_REPO is not set", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_REPO: undefined,
        GITHUB_REPOSITORY: "a-different-fake/fake-repo",
      };

      const expected = {
        repo: {
          owner: "a-different-fake",
          repo: "fake-repo",
        },
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });

    it("ignores GITHUB_REPOSITORY when INPUT_REPO is set", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        GITHUB_REPOSITORY: "a-different-fake/fake-repo",
      };

      const expected = {
        repo: {
          owner: "a-fake-user",
          repo: "fake-repo",
        },
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });

    it("ignores the token from env if set as input", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        GITHUB_TOKEN: "an-env-token",
      };

      const expected = {
        githubToken: "token",
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });

    it("uses the token from env if not set as input", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_GITHUB_TOKEN: undefined,
        GITHUB_TOKEN: "an-env-token",
      };

      const expected = {
        githubToken: "an-env-token",
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });

    it("sets should delete releases when its set", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_DELETE_RELEASE: "true",
      };

      const expected = {
        shouldDeleteReleases: true,
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });

    it("sets should delete releases to false when its not set", async () => {
      process.env = {
        ...process.env,
        ...defaultEnvironment,
        INPUT_DELETE_RELEASE: undefined,
      };

      const expected = {
        shouldDeleteReleases: false,
      };
      const actual = getInputs();

      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });
  });

  describe("Action tests", () => {
    const defaultArguments: Omit<WorkflowInput, "octokit"> = {
      githubToken: "a-fake-token",
      repo: { owner: "a-fake-user", repo: "a-fake-repo" },
      tagName: "a-fake-tag",
      shouldDeleteReleases: true,
    };

    /**
     * Runs the action using the provided inputs.
     */
    const runAction = async (inputs: WorkflowInput): Promise<void> => {
      // Forces Node to re-run `index.ts` as if it were a fresh run.
      delete require.cache[require.resolve("./index.ts")];
      const { run } = require("./index.ts");
      await run(inputs);
    };

    beforeEach(() => {
      jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("Unexpected action exit. Check console.");
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });

    it("does nothing when repo isn't provided", async () => {
      const inputs = {
        ...defaultArguments,
        repo: undefined,
        octokit: createOctokit(),
      };
      await expect(
        runAction(inputs as unknown as WorkflowInput)
      ).rejects.toBeTruthy();
    });

    it("does nothing without an tagName input", async () => {
      const inputs = {
        ...defaultArguments,
        tagName: undefined,
        octokit: createOctokit(),
      };
      // This tests the back-up validation logic works as expected in case the types are wrong, hence the weird casting.
      await expect(
        runAction(inputs as unknown as WorkflowInput)
      ).rejects.toBeTruthy();
    });

    it("does nothing when without a Github token", async () => {
      const inputs = {
        ...defaultArguments,
        githubToken: undefined,
        octokit: createOctokit(),
      };
      // This tests the back-up validation logic works as expected in case the types are wrong, hence the weird casting.
      await expect(
        runAction(inputs as unknown as WorkflowInput)
      ).rejects.toBeTruthy();
    });

    it("does nothing when shouldDeleteRelease is undefined", async () => {
      const inputs = {
        ...defaultArguments,
        shouldDeleteReleases: undefined,
        octokit: createOctokit(),
      };
      // This tests the back-up validation logic works as expected in case the types are wrong, hence the weird casting.
      await expect(
        runAction(inputs as unknown as WorkflowInput)
      ).rejects.toBeTruthy();
    });

    it("only deletes the tag when INPUT_DELETE_RELEASE is false", async () => {
      const deleteRef = jest.fn<Octokit["rest"]["git"]["deleteRef"]>();
      const octokit = createOctokit({
        rest: {
          git: {
            deleteRef,
          },
        },
      });
      const inputs: WorkflowInput = {
        ...defaultArguments,
        shouldDeleteReleases: false,
        octokit,
      };

      await runAction(inputs);

      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: "a-fake-user",
        repo: "a-fake-repo",
        ref: "tags/a-fake-tag",
      });
    });

    it("does delete multiple releases and the tag when INPUT_DELETE_RELEASE is true", async () => {
      const deleteRef = jest.fn();
      const listReleases = jest.fn<Octokit["rest"]["repos"]["listReleases"]>();
      const deleteRelease = jest.fn();
      const octokit = createOctokit({
        rest: {
          git: {
            deleteRef,
          },
          repos: {
            listReleases,
            deleteRelease,
          },
        },
      });
      const inputs: WorkflowInput = {
        ...defaultArguments,
        octokit,
      };

      listReleases.mockResolvedValueOnce(
        createListReleaseResponse({
          data: [
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: false,
              id: 1,
            }),
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: false,
              id: 2,
            }),
            createReleaseData({ tag_name: "no-delete", draft: false, id: 3 }),
          ],
        })
      );

      await runAction(inputs);

      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: "a-fake-user",
        repo: "a-fake-repo",
        ref: "tags/a-fake-tag",
      });
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo,
      });
      expect(deleteRelease).toHaveBeenCalledTimes(2);
      expect(deleteRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 1,
        })
      );
      expect(deleteRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 2,
        })
      );
      expect(deleteRelease).not.toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 3,
        })
      );
    });

    it("does not delete a draft release", async () => {
      const deleteRef = jest.fn();
      const listReleases = jest.fn<Octokit["rest"]["repos"]["listReleases"]>();
      const deleteRelease = jest.fn();
      const octokit = createOctokit({
        rest: {
          git: {
            deleteRef,
          },
          repos: {
            listReleases,
            deleteRelease,
          },
        },
      });
      const inputs: WorkflowInput = {
        ...defaultArguments,
        octokit,
      };

      listReleases.mockResolvedValueOnce(
        createListReleaseResponse({
          data: [
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: true,
              id: 1,
            }),
          ],
        })
      );

      await runAction(inputs);

      expect(deleteRef).toHaveBeenCalledTimes(1);
      expect(deleteRef).toHaveBeenCalledWith({
        owner: "a-fake-user",
        repo: "a-fake-repo",
        ref: "tags/a-fake-tag",
      });
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo,
      });
      expect(deleteRelease).not.toHaveBeenCalled();
    });

    it("stops deleting releases when one fails to delete", async () => {
      const deleteRef = jest.fn();
      const listReleases = jest.fn<Octokit["rest"]["repos"]["listReleases"]>();
      const deleteRelease = jest.fn();
      const octokit = createOctokit({
        rest: {
          git: {
            deleteRef,
          },
          repos: {
            listReleases,
            deleteRelease,
          },
        },
      });

      const inputs: WorkflowInput = {
        ...defaultArguments,
        octokit,
      };

      listReleases.mockResolvedValueOnce(
        createListReleaseResponse({
          data: [
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: false,
              id: 1,
            }),
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: false,
              id: 2,
            }),
            createReleaseData({
              tag_name: defaultArguments.tagName,
              draft: false,
              id: 3,
            }),
          ],
        })
      );
      deleteRelease.mockImplementation(async ({ release_id }: any) => {
        if (release_id === 1) {
          throw new Error("Something bad happened!");
        }
      });

      await expect(runAction(inputs)).rejects.toBeTruthy();

      expect(deleteRef).not.toHaveBeenCalled();
      expect(listReleases).toHaveBeenCalledTimes(1);
      expect(listReleases).toBeCalledWith({
        owner: defaultArguments.repo.owner,
        repo: defaultArguments.repo.repo,
      });
      expect(deleteRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 1,
        })
      );
      expect(deleteRelease).not.toHaveBeenCalledWith(
        expect.objectContaining({
          release_id: 2,
        })
      );
    });

    /**
     * Create a new Octokit instance for testing. The typings here are very loose since Jest can't accurately model the
     * complex types of Octokit.
     *
     * It's expected that calling this will look something like the following:
     *
     * ```js
     * createOctokit({
     *   rest: {
     *     git: {
     *       deleteRef
     *     }
     *   }
     * })
     * ```
     *
     * @param implementation The implementation of Octokit.
     */
    const createOctokit = (implementation: any = {}): Octokit => {
      // We cheat here to get around Typescript's strict typing since this is a test. We only need a subset of
      // Octokit to be mocked so provide that as implementation and forget the rest.
      return implementation as Octokit;
    };

    type ListReleaseResponse = Awaited<
      ReturnType<Octokit["rest"]["repos"]["listReleases"]>
    >;
    type ReleaseData = ListReleaseResponse["data"][number];
    const createReleaseData = (data: Partial<ReleaseData>): ReleaseData => {
      return data as ReleaseData;
    };

    const createListReleaseResponse = (
      data: Partial<ListReleaseResponse>
    ): ListReleaseResponse => {
      return data as ListReleaseResponse;
    };
  });
});
