import { StatusBadge } from './badge-1'

export type ShippingClassification = 'naver' | 'coupang' | 'unclassified' | 'ambiguous'

export function ShippingClassificationBadge({ classification }: { classification: ShippingClassification }) {
  if (classification === 'naver') {
    return <StatusBadge tone="info">네이버</StatusBadge>
  }

  if (classification === 'coupang') {
    return <StatusBadge tone="success">쿠팡</StatusBadge>
  }

  if (classification === 'ambiguous') {
    return <StatusBadge tone="warning">중복 후보</StatusBadge>
  }

  return <StatusBadge tone="neutral">미분류</StatusBadge>
}
