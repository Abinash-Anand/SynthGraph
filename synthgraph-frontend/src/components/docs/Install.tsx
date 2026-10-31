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
        <Callout type="note" title="Why not pip install synthgraph?">
          <p>
            Version {PRODUCT.sdkVersion} of the SDK is not on PyPI yet. Until it is, install from GitHub as
            shown. You need Python {PRODUCT.pythonRequires} and git.
          </p>
        </Callout>
      )}
    </div>
  );
}
