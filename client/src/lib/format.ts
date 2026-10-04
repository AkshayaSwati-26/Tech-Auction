const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Whole rupees, en-IN grouping: 10000 -> "₹10,000". */
export function formatRupees(amount: number): string {
  return rupees.format(amount);
}
