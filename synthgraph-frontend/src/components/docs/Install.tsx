import { PRODUCT, SDK_INSTALL_COMMAND } from "@/data/product";
import { Callout } from "./Callout";
import { DocsCode } from "./DocsCode";

/**
 * The command that installs the current SDK. It reads data/product.ts, so the
 * docs switch to the short PyPI command once the repository version is published.
 */
export function Install() {
  return (
    <div className="[&>*+*]:mt-3">
      <DocsCode>
        <pre>
          <code>{SDK_INSTALL_COMMAND}</code>
        </pre>
      </DocsCode>
      {PRODUCT.sdkOnPyPI ? null : (
        <Callout type="note" title="Why not pip install synthgraph-sdk?">
          <p>
            The version of <code>synthgraph-sdk</code> on PyPI is older than the one in the repository and does
            not work with the current backend. Until {PRODUCT.sdkVersion} is published there, install from
            GitHub as shown. You need Python {PRODUCT.pythonRequires} and git.
          </p>
        </Callout>
      )}
    </div>
  );
}
