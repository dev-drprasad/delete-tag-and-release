import { getInputs, run } from "./index.js";

run(getInputs()).catch((reason) => {
  console.error(reason);
});
