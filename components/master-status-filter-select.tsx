"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StatusFilterOption = {
  label: string;
  value: string;
};

type MasterStatusFilterSelectProps = {
  defaultValue?: string;
  id: string;
  name: string;
  options: StatusFilterOption[];
};

export function MasterStatusFilterSelect({
  defaultValue = "",
  id,
  name,
  options
}: MasterStatusFilterSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0],
    [options, value]
  );

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="custom-select status" ref={rootRef}>
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={`${id}-dropdown`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="custom-select__trigger"
        id={id}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="custom-select__trigger-label">{selectedOption?.label || "Все"}</span>
        <span aria-hidden="true" className="custom-select__chevron">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="custom-select__dropdown" id={`${id}-dropdown`} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={isSelected ? "custom-select__option is-active" : "custom-select__option"}
                key={option.value || "__all__"}
                onClick={() => {
                  setValue(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
