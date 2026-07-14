export type ChannelName = 'naver' | 'coupang'

export type ChannelListingStatus = 'active' | 'paused' | 'unregistered' | 'sync-error'

export type ChannelProductSnapshot = {
  channel: ChannelName
  externalProductId: string
  externalVariantId: string
  sellerSku: string | null
  productName: string | null
  optionName: string | null
  listingStatus: ChannelListingStatus
  stockQuantity: number | null
  price: number | null
  imageUrl: string | null
  rawAttributes: Record<string, unknown>
}
