// Single source of truth for product names and prices used by the storefront and order APIs.
// Confirm these amounts with the seller before enabling real order intake.
export const ORDER_CATALOG: Record<number, { name: string; unit: string; price: number }> = {
  1: { name: 'Живые раки — мелкие', unit: 'кг', price: 1900 },
  5: { name: 'Живые раки — средние', unit: 'кг', price: 2300 },
  6: { name: 'Живые раки — крупные', unit: 'кг', price: 2900 },
  7: { name: 'Живые раки — отборные', unit: 'кг', price: 3500 },
};
