# Domain context

## Core terms

- **채널 상품 매핑 (`ChannelProductRef`)**: 사용자가 입력한 채널 판매 옵션 식별자와 내부 SKU의 명시적 참조다. 내부 SKU 하나는 채널별 옵션을 여러 개 가질 수 있으며, 매핑되지 않은 항목은 `연결 필요` 상태로 남긴다.
- **판매·재고 단위 (`ProductVariant`)**: seller SKU 기준의 내부 판매 및 재고 단위이며, 실제 창고 수량이 source of truth다.
- **내부 상품**: 채널 상품을 연결하는 보조 내부 모델. local-only server action으로 제한된 variant/SKU 조합을 만든다.
- **가용 재고 (`available`)**: `onHand - committed`. 채널의 모든 매핑 옵션에 전송하는 절대 수량이다.
- **예약 재고 (`committed`)**: 주문 확정 후 발송 전 확보된 수량. 취소는 예약만 해제하고, 발송 성공 때만 해제와 `onHand` 차감을 함께 처리한다.
- **입고 예정 (`incoming`)**: 공장 공급 참고 수량이며 검수 전에는 `available` 및 채널 재고에 포함하지 않는다. 반품도 검수 입고 뒤에만 `onHand`를 복구한다.

## Ownership

- `/products`: 상품과 창고 기준정보
- `/orders`: 주문과 송장 업로드·분류·발송
- 재고 운영: 재고 목록, 이력, 수동 입고·출고
- `/settings`: 스토어 연결과 자격 증명

The detailed product and architectural rules remain in `docs/product/`, `docs/architecture/`, and the relevant ADRs.
