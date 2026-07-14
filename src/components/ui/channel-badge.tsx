import { CheckCircle2, CircleOff, Clock3, Link2Off, PackageX, PauseCircle, TriangleAlert } from 'lucide-react'
import { Badge, type BadgeTone } from './badge-1'

export type Channel = 'naver' | 'coupang'
export type ChannelListingStatus = 'active' | 'sold-out' | 'approval-pending' | 'mapping-required' | 'unregistered' | 'paused' | 'sync-error'

type ChannelBadgeProps = {
  channel: Channel
  listingStatus: ChannelListingStatus
  compact?: boolean
}

const channelLabels: Record<Channel, string> = {
  naver: '네이버',
  coupang: '쿠팡',
}

const listingStatusMeta: Record<Exclude<ChannelListingStatus, 'active'>, { label: string; tone: BadgeTone; icon: typeof CheckCircle2 }> = {
  unregistered: { label: '미등록', tone: 'neutral', icon: CircleOff },
  'sold-out': { label: '품절', tone: 'neutral', icon: PackageX },
  'approval-pending': { label: '승인 대기', tone: 'warning', icon: Clock3 },
  'mapping-required': { label: '연결 필요', tone: 'danger', icon: Link2Off },
  paused: { label: '판매 중지', tone: 'warning', icon: PauseCircle },
  'sync-error': { label: '동기화 오류', tone: 'danger', icon: TriangleAlert },
}

export function ChannelBadge({ channel, listingStatus, compact = false }: ChannelBadgeProps) {
  const status = listingStatus === 'active'
    ? { label: '판매 중', tone: channel === 'naver' ? 'success' as const : 'info' as const, icon: CheckCircle2 }
    : listingStatusMeta[listingStatus]
  const separator = compact ? ' ' : ' · '
  const Icon = status.icon

  return <Badge tone={status.tone} icon={<Icon className="h-3 w-3" />}>{channelLabels[channel]}{separator}{status.label}</Badge>
}
