import { cn } from "@/lib/utils";

type GlyphKind =
  | "capture"
  | "version"
  | "connect"
  | "search"
  | "compare"
  | "reproduce";

/**
 * Small technical illustrations for the value-chain cards.
 *
 * Deliberately SVG and CSS rather than WebGL: six live GL contexts on one
 * screen would cost far more than the effect is worth, and these need to read
 * clearly at 132px tall.
 */
export function CardGlyph({ kind }: { kind: GlyphKind }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 80%)",
        }}
        aria-hidden
      />
      <svg
        viewBox="0 0 200 110"
        className="relative h-[104px] w-full max-w-[200px]"
        fill="none"
        aria-hidden
      >
        {kind === "capture" ? <Capture /> : null}
        {kind === "version" ? <Version /> : null}
        {kind === "connect" ? <Connect /> : null}
        {kind === "search" ? <Search /> : null}
        {kind === "compare" ? <Compare /> : null}
        {kind === "reproduce" ? <Reproduce /> : null}
      </svg>
    </div>
  );
}

const stroke = "var(--color-line-strong)";
const accent = "var(--color-cyan)";

/** Scattered values collapsing into one structured record. */
function Capture() {
  const sources: Array<[number, number]> = [
    [30, 22],
    [22, 55],
    [34, 88],
    [56, 36],
    [52, 76],
  ];
  return (
    <g>
      <rect x="118" y="34" width="62" height="42" rx="4" stroke={stroke} strokeWidth="1" />
      {[44, 55, 66].map((y, index) => (
        <line
          key={y}
          x1="126"
          y1={y}
          x2={index === 1 ? 156 : 172}
          y2={y}
          stroke={index === 0 ? accent : stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      {sources.map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          <line
            x1={x}
            y1={y}
            x2="118"
            y2="55"
            stroke={stroke}
            strokeWidth="1"
            className="opacity-40 transition-opacity duration-500 group-hover:opacity-80"
          />
          <circle
            cx={x}
            cy={y}
            r="3"
            fill={accent}
            className="opacity-50 transition-opacity duration-500 group-hover:opacity-100"
            style={{ transitionDelay: `${index * 50}ms` }}
          />
        </g>
      ))}
    </g>
  );
}

/** A logical thing with a version history hanging off it. */
function Version() {
  return (
    <g>
      <rect x="16" y="44" width="46" height="22" rx="3" stroke={stroke} strokeWidth="1" />
      <text x="24" y="59" className="fill-[var(--color-ink-dim)] font-mono text-[9px]">
        dataset
      </text>
      {[
        [26, "v1", false],
        [55, "v2", false],
        [84, "v3", true],
      ].map(([y, label, active], index) => (
        <g key={label as string}>
          <path
            d={`M62 55 H82 V${y} H104`}
            stroke={active ? accent : stroke}
            strokeWidth="1"
            className="transition-[stroke] duration-500"
          />
          <rect
            x="104"
            y={(y as number) - 11}
            width="38"
            height="22"
            rx="3"
            stroke={active ? accent : stroke}
            strokeWidth="1"
            className="transition-[stroke] duration-500"
          />
          <text
            x="116"
            y={(y as number) + 4}
            className={cn(
              "font-mono text-[9px] transition-[fill] duration-500",
              active ? "fill-[var(--color-cyan)]" : "fill-[var(--color-ink-dim)]",
            )}
            style={{ transitionDelay: `${index * 60}ms` }}
          >
            {label as string}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Four records and the directed edges between them. */
function Connect() {
  const nodes: Array<[number, number, string]> = [
    [30, 34, "var(--color-node-generation)"],
    [78, 76, "var(--color-node-dataset)"],
    [126, 34, "var(--color-node-training)"],
    [172, 74, "var(--color-node-evaluation)"],
  ];
  return (
    <g>
      {nodes.slice(0, -1).map(([x, y], index) => {
        const next = nodes[index + 1];
        if (!next) return null;
        return (
          <line
            key={`edge-${index}`}
            x1={x}
            y1={y}
            x2={next[0]}
            y2={next[1]}
            stroke={stroke}
            strokeWidth="1"
            className="opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          />
        );
      })}
      {nodes.map(([x, y, color], index) => (
        <circle
          key={`node-${index}`}
          cx={x}
          cy={y}
          r="5"
          fill={color}
          className="opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          style={{ transitionDelay: `${index * 70}ms` }}
        />
      ))}
    </g>
  );
}

/** A result set narrowing under a filter. */
function Search() {
  return (
    <g>
      <rect x="24" y="20" width="152" height="16" rx="3" stroke={accent} strokeWidth="1" />
      <text x="32" y="32" className="fill-[var(--color-cyan)] font-mono text-[8px]">
        generator: blender · occlusion &gt; 0.3
      </text>
      {[46, 60, 74, 88].map((y, index) => {
        const match = index === 0 || index === 2;
        return (
          <rect
            key={y}
            x="24"
            y={y}
            width={match ? 152 : 96}
            height="10"
            rx="2"
            fill={match ? "var(--color-cyan)" : stroke}
            fillOpacity={match ? 0.22 : 0.5}
            stroke={match ? accent : "none"}
            strokeWidth="1"
            className="transition-all duration-500 group-hover:opacity-100"
            style={{ transitionDelay: `${index * 60}ms` }}
          />
        );
      })}
    </g>
  );
}

/** Two configurations with one row differing. */
function Compare() {
  return (
    <g>
      <line x1="100" y1="18" x2="100" y2="94" stroke={stroke} strokeWidth="1" strokeDasharray="3 3" />
      {[26, 42, 58, 74].map((y, index) => {
        const differs = index === 2;
        return (
          <g key={y}>
            <rect
              x="20"
              y={y}
              width="70"
              height="11"
              rx="2"
              fill={differs ? "var(--color-warn)" : stroke}
              fillOpacity={differs ? 0.28 : 0.45}
            />
            <rect
              x="110"
              y={y}
              width="70"
              height="11"
              rx="2"
              fill={differs ? "var(--color-warn)" : stroke}
              fillOpacity={differs ? 0.28 : 0.45}
            />
            {differs ? (
              <rect
                x="110"
                y={y}
                width="70"
                height="11"
                rx="2"
                stroke="var(--color-warn)"
                strokeWidth="1"
                className="transition-opacity duration-500"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** Evidence assembling into a manifest, with one gap left open. */
function Reproduce() {
  return (
    <g>
      <rect x="62" y="18" width="76" height="76" rx="4" stroke={stroke} strokeWidth="1" />
      {[
        [32, "var(--color-node-generation)"],
        [46, "var(--color-node-asset)"],
        [60, "var(--color-node-dataset)"],
        [74, "var(--color-warn)"],
      ].map(([y, color], index) => (
        <g key={y as number}>
          <circle cx="72" cy={y as number} r="2.5" fill={color as string} />
          <line
            x1="80"
            y1={y as number}
            x2={index === 3 ? 112 : 128}
            y2={y as number}
            stroke={index === 3 ? "var(--color-warn)" : stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={index === 3 ? "3 3" : undefined}
          />
        </g>
      ))}
      <text x="62" y="105" className="fill-[var(--color-ink-faint)] font-mono text-[7.5px]">
        1 dependency missing
      </text>
    </g>
  );
}
