"use client";

import { useEffect, useId, useState } from "react";

type SearchAutocompleteProps = {
  name: "q" | "location";
  label: string;
  placeholder: string;
  defaultValue?: string;
  className?: string;
};

export function SearchAutocomplete({ name, label, placeholder, defaultValue, className }: SearchAutocompleteProps) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void fetch(`/api/suggestions?field=${name}&q=${encodeURIComponent(value.trim())}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Suggestions request failed (${response.status}).`);
          const result: unknown = await response.json();
          if (!Array.isArray(result) || !result.every((item) => typeof item === "string")) {
            throw new Error("Suggestions response has an unexpected shape.");
          }
          setSuggestions(result);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Search suggestions could not be loaded:", error);
          setSuggestions([]);
        });
    }, 180);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [name, value]);

  return <>
    <input aria-label={label} className={className} defaultValue={defaultValue} list={listId} maxLength={100} name={name} onChange={(event) => setValue(event.currentTarget.value)} placeholder={placeholder} />
    <datalist id={listId}>{suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
  </>;
}
