import { ImageResponse } from "next/og";
import { PRODUCT } from "@/data/product";

// The preview shown when a page of the marketing site is shared. Generated at
// build time, so there is no binary asset to keep in step with the product.
export const alt = "SynthGraph: know exactly what produced your model";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06070a",
          color: "#e9edf4",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["#37c9de", "#5b8dfb", "#626d81", "#46b97e"].map((color) => (
              <div key={color} style={{ width: 22, height: 22, borderRadius: 11, background: color }} />
            ))}
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>SynthGraph</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 88, lineHeight: 1.02, fontWeight: 600, letterSpacing: -2.5, maxWidth: 980 }}>
            Know exactly what produced your model.
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#9aa4b6", maxWidth: 900 }}>
            Generator, seed and parameters, dataset versions, training runs and evaluations, linked into
            one graph.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 24, color: "#626d81" }}>
          <div>Open source</div>
          <div>{PRODUCT.license}</div>
          <div>{`SDK ${PRODUCT.sdkVersion} alpha`}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
