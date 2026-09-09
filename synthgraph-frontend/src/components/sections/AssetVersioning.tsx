import { AssetScene } from "@/components/3d/dynamic";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { demoAssets } from "@/data/demo-data";

export function AssetVersioning() {
  return (
    <Section id="asset-versioning">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="Asset versioning"
              title="The scene matters. So do the assets."
              lede="Generations can reference exact asset versions rather than merely recording an asset name. A run that used vehicle-model:v7 stays distinguishable from one that used v2, long after the file on disk has been replaced."
            />

            <Reveal delay={0.1}>
              <ul className="mt-10 flex flex-col gap-6">
                {demoAssets.map((asset) => (
                  <li key={asset.name}>
                    <p className="font-mono text-[13.5px] text-ink">{asset.name}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {asset.versions.map((version) => {
                        const used = version === asset.used;
                        return (
                          <li
                            key={version}
                            className={
                              used
                                ? "rounded border border-node-asset/45 bg-node-asset/10 px-2.5 py-1 font-mono text-[11.5px] text-node-asset"
                                : "rounded border border-line px-2.5 py-1 font-mono text-[11.5px] text-ink-dim"
                            }
                          >
                            {version}
                            {used ? (
                              <span className="ml-2 text-[9.5px] tracking-[0.12em] uppercase opacity-80">
                                referenced
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </Reveal>

            <p className="mt-8 max-w-[54ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
              Geometry in this scene is generated procedurally from primitives. No third-party
              models or textures are used.
            </p>
          </div>

          <Reveal delay={0.06}>
            <AssetScene />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
