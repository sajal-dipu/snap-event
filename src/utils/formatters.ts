/**
 * Formats a date string or Date object into a readable string
 */
export function formatDate(
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Formats a number to a currency string (USD by default)
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a phone number string (e.g. 1234567890 to (123) 456-7890)
 */
export function formatPhone(phoneString: string): string {
  const cleaned = ("" + phoneString).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phoneString;
}
