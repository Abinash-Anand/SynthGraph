# Tools for the website and documentation

These keep the docs and the website's screenshots true to the product. None of them runs in CI or in the app.

| Script | What it does | When to run it |
| --- | --- | --- |
| `verify-docs.py` | Runs every `python` code block in the docs against a real backend, and checks every `synthgraph` command and option in `bash` blocks against the CLI's own `--help`. | After the SDK, the CLI or the API changes, and before publishing docs. |
| `generate-cli-reference.py` | Rebuilds `src/content/docs/cli/reference.mdx` from the CLI's `--help` output. | After the CLI changes. |
| `seed-demo.py` | Records an invented demo workspace through the real SDK. | Before re-capturing screenshots. |
| `capture-screens.mjs` | Takes the dashboard screenshots used on the homepage, Product and How It Works pages. | After the dashboard changes visibly. |

## Conventions in the docs

- A fenced block marked `python` is executed by `verify-docs.py`. All of a page's `python` blocks run in order as one script, so a page's first block sets up what later ones use.
- A block marked `py` is illustrative, for example an error that is meant to be raised, and is not executed.
- Do not retype the quickstart's code elsewhere. The homepage and How It Works page import it from `src/data/snippets.ts`, and `src/data/snippets.test.ts` fails if it differs from the quickstart's block.

## Refreshing the screenshots

1. Start a local backend, and a production build of this frontend: `npm run build` then `npx next start -p 3003`.
2. Create a throwaway account and an API key, then run `python scripts/docs/seed-demo.py`. Note the ids it prints.
3. In an empty folder outside the repository, run `npm init -y` and `npm install playwright-core`. It drives the Microsoft Edge that is already installed.
4. Run `capture-screens.mjs` from that folder (the header of the file lists the variables).
5. Convert to WebP into `public/screens/`:

   ```bash
   ffmpeg -i workspace-lineage.png -vf "scale=1800:-2" -c:v libwebp -quality 82 public/screens/lineage.webp
   ```

   The files used are `overview`, `lineage`, `metrics`, `reproduction` (1800 px wide) and `leaderboard` (cropped to the controls and the note, 1500 px wide).

Screenshots show invented numbers. They are labelled "demo data" on the site, and must stay labelled.
