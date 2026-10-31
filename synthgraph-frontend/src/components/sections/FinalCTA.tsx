import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { PRODUCT } from "@/data/product";

export function FinalCTA() {
  return (
    <section id="get-started" className="relative overflow-hidden border-t border-line py-28 md:py-36">
      <div
        className="grid-field pointer-events-none absolute inset-0"
        style={{ maskImage: "radial-gradient(ellipse 70% 80% at 50% 100%, #000 10%, transparent 75%)" }}
        aria-hidden
      />

      <div className="shell relative flex flex-col items-center text-center">
        <Reveal>
          <Badge tone="cyan" dot>
            Open source · {PRODUCT.license}
          </Badge>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="mt-8 max-w-[16ch] text-[38px] leading-[1.02] font-medium tracking-[-0.03em] text-gradient-ink md:text-[62px]">
            Your next experiment should leave a trail.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-ink-muted md:text-[19px]">
            Install the SDK and record your next generation. The next time someone asks which seed, you
            will already have the answer.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/docs/quickstart" size="lg" arrow>
              Get started
            </ButtonLink>
            <ButtonLink href="/register" size="lg" variant="secondary">
              Create an account
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-8 max-w-[62ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
            SDK {PRODUCT.sdkVersion} is an alpha: the API only changes by adding, and the SDK can still
            change. See the docs for what it does and what it does not do.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
