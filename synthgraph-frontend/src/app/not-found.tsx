import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mono-label">404</p>
      <h1 className="mt-6 max-w-[20ch] text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
        That page has no record here.
      </h1>
      <div className="mt-8">
        <ButtonLink href="/" arrow>
          Back to the homepage
        </ButtonLink>
      </div>
    </div>
  );
}
