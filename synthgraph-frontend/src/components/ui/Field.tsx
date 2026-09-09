"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-md border bg-base/60 px-3.5 py-2.5 text-[14.5px] text-ink " +
  "placeholder:text-ink-faint transition-colors duration-200 " +
  "focus:border-cyan/50 focus:outline-none";

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
};

function Wrapper({
  label,
  hint,
  error,
  required,
  id,
  describedBy,
  children,
}: BaseProps & { id: string; describedBy: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-[13.5px] text-ink">
        {label}
        {required ? null : (
          <span className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
            optional
          </span>
        )}
      </label>
      {children}
      <div id={describedBy} className="flex flex-col gap-1">
        {hint ? <p className="font-mono text-[11px] text-ink-faint">{hint}</p> : null}
        {error ? (
          <p className="font-mono text-[11.5px] text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  ...rest
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const describedBy = `${id}-desc`;
  return (
    <Wrapper {...rest} id={id} describedBy={describedBy}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={rest.required}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlBase, rest.error ? "border-bad/60" : "border-line")}
      />
    </Wrapper>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  ...rest
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  const describedBy = `${id}-desc`;
  return (
    <Wrapper {...rest} id={id} describedBy={describedBy}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        required={rest.required}
        aria-invalid={rest.error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlBase, "resize-y", rest.error ? "border-bad/60" : "border-line")}
      />
    </Wrapper>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  ...rest
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const id = useId();
  const describedBy = `${id}-desc`;
  return (
    <Wrapper {...rest} id={id} describedBy={describedBy}>
      <div className="relative">
        <select
          id={id}
          value={value}
          required={rest.required}
          aria-invalid={rest.error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            controlBase,
            "appearance-none pr-9",
            rest.error ? "border-bad/60" : "border-line",
            value ? "text-ink" : "text-ink-faint",
          )}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option} value={option} className="bg-surface text-ink">
              {option}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-dim"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </Wrapper>
  );
}

export function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  error,
  hint,
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (option: string) => void;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={`${id}-desc`}>
      <legend className="text-[13.5px] text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "cursor-pointer rounded-md border px-3 py-2 text-[13.5px] transition-colors duration-200",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan",
                "has-[:focus-visible]:outline-offset-2",
                checked
                  ? "border-cyan/45 bg-cyan/[0.07] text-ink"
                  : "border-line bg-base/50 text-ink-muted hover:border-line-strong",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => onToggle(option)}
              />
              {option}
            </label>
          );
        })}
      </div>
      <div id={`${id}-desc`} className="mt-2 flex flex-col gap-1">
        {hint ? <p className="font-mono text-[11px] text-ink-faint">{hint}</p> : null}
        {error ? (
          <p className="font-mono text-[11.5px] text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
