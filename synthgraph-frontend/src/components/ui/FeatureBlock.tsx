import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

export type Feature = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Field names as they appear in the data model. */
  fields?: Array<[string, string]>;
  note?: string;
  status?: ReactNode;
};

/**
 * The repeating unit of the product, research and security pages: a named
 * concept, what it means, and the fields it actually carries.
 */
export function FeatureBlock({ feature, index }: { feature: Feature; index: number }) {
  return (
    <Reveal as="li" delay={0.04}>
      <article
        id={feature.id}
        className="grid gap-6 border-t border-line py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-14"
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-faint">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mono-label">{feature.eyebrow}</p>
          </div>
          <h2 className="mt-4 max-w-[22ch] text-[24px] leading-[1.15] font-medium tracking-[-0.02em] text-ink md:text-[28px]">
            {feature.title}
          </h2>
          {feature.status ? <div className="mt-4">{feature.status}</div> : null}
        </div>

        <div>
          <p className="max-w-[62ch] text-[15.5px] leading-[1.68] text-ink-muted md:text-[16.5px]">
            {feature.body}
          </p>

          {feature.fields ? (
            <dl className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {feature.fields.map(([field, description]) => (
                <div key={field} className="border-t border-line pt-2.5">
                  <dt className="font-mono text-[12px] text-ink">{field}</dt>
                  <dd className="mt-0.5 text-[13.5px] leading-[1.55] text-ink-dim">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {feature.note ? (
            <p className="mt-6 max-w-[62ch] rounded-md border border-line bg-surface/50 p-4 text-[14px] leading-[1.65] text-ink-muted">
              {feature.note}
            </p>
          ) : null}
        </div>
      </article>
    </Reveal>
  );
}

export function FeatureList({ features }: { features: Feature[] }) {
  return (
    <ul className="flex flex-col">
      {features.map((feature, index) => (
        <FeatureBlock key={feature.id} feature={feature} index={index} />
      ))}
    </ul>
  );
}
