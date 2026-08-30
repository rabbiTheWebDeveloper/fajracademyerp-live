import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeRegex(string: string = ""): string {
  if (!string || typeof string !== "string") return ""
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
