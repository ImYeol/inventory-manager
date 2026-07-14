import { Badge, type BadgeTone } from './badge-1'

export type Channel = 'naver' | 'coupang'
export type ChannelListingStatus = 'active' | 'unregistered' | 'paused' | 'sync-error'

type ChannelBadgeProps = {
  channel: Channel
  listingStatus: ChannelListingStatus
  compact?: boolean
}

const channelLabels: Record<Channel, string> = {
  naver: '네이버',
  coupang: '쿠팡',
}

const listingStatusMeta: Record<Exclude<ChannelListingStatus, 'active'>, { label: string; tone: BadgeTone }> = {
  unregistered: { label: '미등록', tone: 'neutral' },
  paused: { label: '판매 중지', tone: 'warning' },
  'sync-error': { label: '동기화 오류', tone: 'danger' },
}

export function ChannelBadge({ channel, listingStatus, compact = false }: ChannelBadgeProps) {
  const status = listingStatus === 'active'
    ? { label: '판매 중', tone: channel === 'naver' ? 'success' : 'info' }
    : listingStatusMeta[listingStatus]
  const separator = compact ? ' ' : ' · '

  return <Badge tone={status.tone}>{channelLabels[channel]}{separator}{status.label}</Badge>
}
