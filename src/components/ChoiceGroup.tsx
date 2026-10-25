"use client";

import { useId, type Ref } from "react";
import { CheckIcon } from "./icons";
import styles from "./ChoiceGroup.module.css";

export type Tone = "blue" | "green" | "yellow" | "pink" | "lavender" | "sky" | "mint" | "peach";

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  lang?: string;
  tone?: Tone;
};

type Props<T extends string> = {
  legend: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  layout?: "row" | "column";
  describedBy?: string;
  ref?: Ref<HTMLFieldSetElement>;
};

// Native radio inputs styled as cards: browsers already handle arrow keys (including RTL),
// grouping and screen-reader announcements.
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  layout = "row",
  describedBy,
  ref,
}: Props<T>) {
  const name = useId();

  return (
    <fieldset ref={ref} className={styles.fieldset} aria-describedby={describedBy}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={`${styles.options} ${styles[layout]}`}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`${styles.option} ${styles[option.tone ?? "sky"]}`}
              lang={option.lang}
            >
              <input
                type="radio"
                className={styles.input}
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              <span className={styles.indicator} aria-hidden="true">
                {checked && <CheckIcon size={16} />}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{option.label}</span>
                {option.hint && <span className={styles.hint}>{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

