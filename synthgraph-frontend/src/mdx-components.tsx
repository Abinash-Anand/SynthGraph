import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { Callout } from "@/components/docs/Callout";
import { DocsCode } from "@/components/docs/DocsCode";
import { Install } from "@/components/docs/Install";
import { Tab, Tabs } from "@/components/docs/Tabs";

// Required by @next/mdx. Only the documentation uses MDX, so these styles and
// components apply to the docs and nowhere else.

function heading(Tag: "h2" | "h3" | "h4") {
  return function Heading({ id, children, ...rest }: ComponentPropsWithoutRef<"h2">) {
    return (
      <Tag id={id} {...rest}>
        {children}
        {id ? (
          <a className="docs-anchor" href={`#${id}`} aria-label="Link to this section">
            #
          </a>
        ) : null}
      </Tag>
    );
  };
}

function Anchor({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

const components: MDXComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  a: Anchor,
  pre: (props) => (
    <DocsCode>
      <pre {...props} />
    </DocsCode>
  ),
  table: (props) => (
    <div className="docs-table-wrap">
      <table {...props} />
    </div>
  ),
  Callout,
  Install,
  Tabs,
  Tab,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
