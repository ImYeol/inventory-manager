import { redirect } from 'next/navigation'

// 송장 등록은 주문 페이지의 FixedSheet 모달로 흡수됐다(ui-guide.md 규칙 17). 이 경로는 legacy alias다.
export default function TrackingImportPage() {
  redirect('/orders')
}
