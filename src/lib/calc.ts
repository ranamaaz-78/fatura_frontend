function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateLineTotals(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
  taxRatePercent: number,
): { taxableBase: number; taxAmount: number; total: number } {
  const lineGross = round2(quantity * unitPrice)
  const discountAmount = round2(lineGross * (discountPercent / 100))
  const taxableBase = round2(lineGross - discountAmount)
  const taxAmount = round2(taxableBase * (taxRatePercent / 100))
  const total = round2(taxableBase + taxAmount)

  return { taxableBase, taxAmount, total }
}
