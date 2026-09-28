import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely with clsx + tailwind-merge */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format a kobo amount (integer) to a Naira string.
 * Example: 350000 → "₦3,500"
 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(naira)
    .replace('NGN', '₦')
    .trim()
}

/**
 * Format a plain Naira number with ₦ prefix and commas.
 * Example: 3500 → "₦3,500"
 */
export function formatNairaAmount(naira: number): string {
  return (
    '₦' +
    new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(naira)
  )
}
