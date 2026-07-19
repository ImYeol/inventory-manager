/**
 * Seller SKU token rules (ADR-031: seller SKU is source of truth).
 * Shared by the internal product server action and the client-side chip input
 * so an unconvertible size/color value is rejected at add-time, not only on submit.
 */

/** Converts a raw size/color/prefix value into the token used inside a seller SKU. */
export function toSellerSkuToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Whether a raw value survives seller SKU token conversion with a non-empty result. */
export function isSellerSkuConvertible(value: string) {
  return toSellerSkuToken(value).length > 0
}
