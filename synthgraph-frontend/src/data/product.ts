/**
 * Facts about the product that the website and docs state in more than one
 * place. Keep them here so a release changes one file, not twenty.
 *
 * `sdkVersion` is the version in the repository (synthgraph-sdk-cli/pyproject.toml).
 * Flip `sdkOnPyPI` to true once that version is published, and the install
 * instructions switch to the short `pip install` line.
 */
export const PRODUCT = {
  sdkVersion: "1.0.0",
  sdkOnPyPI: false,
  pythonRequires: "3.11+",
  repoUrl: "https://github.com/Abinash-Anand/SynthGraph",
  pypiUrl: "https://pypi.org/project/synthgraph-sdk/",
  license: "MIT",
} as const;

const GITHUB_INSTALL = `pip install "git+${PRODUCT.repoUrl}.git#subdirectory=synthgraph-sdk-cli"`;

/** The command that installs the current SDK today. */
export const SDK_INSTALL_COMMAND = PRODUCT.sdkOnPyPI ? "pip install synthgraph-sdk" : GITHUB_INSTALL;

/** The integrations that exist in the SDK, and what each one really does. */
export const INTEGRATIONS = [
  { name: "stable-baselines3", does: "Extracts configuration and logs metrics automatically through a callback" },
  { name: "skrl", does: "Extracts configuration and logs metrics automatically through a writer" },
  { name: "rl_games", does: "Extracts algorithm, model and network configuration" },
  { name: "Isaac Lab", does: "Extracts domain-randomization event-term configuration" },
  { name: "MuJoCo Playground", does: "Extracts environment configuration and the domain-randomize source" },
  { name: "Weights & Biases", does: "Reads configuration and summary from an existing run" },
] as const;
