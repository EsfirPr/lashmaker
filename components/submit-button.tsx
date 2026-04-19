"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({ children, className = "button", disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {pending ? "Секунду..." : children}
    </button>
  );
}
