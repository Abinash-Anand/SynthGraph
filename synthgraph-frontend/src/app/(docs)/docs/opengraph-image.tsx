import { ImageResponse } from "next/og";
import { PRODUCT } from "@/data/product";

// The preview shown when a documentation page is shared.
export const alt = "SynthGraph documentation";
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
          <div style={{ fontSize: 22, color: "#626d81", letterSpacing: 4, marginLeft: 12 }}>DOCS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 92, lineHeight: 1.02, fontWeight: 600, letterSpacing: -2.5 }}>Documentation</div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#9aa4b6", maxWidth: 900 }}>
            Quickstart, SDK guides, the dashboard, the command line, the API, and how to run it yourself.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 24, color: "#626d81" }}>
          <div>{`Python SDK ${PRODUCT.sdkVersion}`}</div>
          <div>{PRODUCT.license}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
