import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(val: number, decimals = 0): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(val: number): string {
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${val.toFixed(1)}%`;
}
