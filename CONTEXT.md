# Domain context

## Core terms

- **채널 상품 매핑 (`ChannelProductRef`)**: 사용자가 입력한 채널 판매 옵션 식별자와 내부 SKU의 명시적 참조다. 내부 SKU 하나는 채널별 옵션을 여러 개 가질 수 있으며, 매핑되지 않은 항목은 `연결 필요` 상태로 남긴다.
- **판매·재고 단위 (`ProductVariant`)**: seller SKU 기준의 내부 판매 및 재고 단위이며, 실제 창고 수량이 source of truth다.
- **내부 상품**: 채널 상품을 연결하는 보조 내부 모델. local-only server action으로 제한된 variant/SKU 조합을 만든다.
- **가용 재고 (`available`)**: `onHand - committed`. 채널의 모든 매핑 옵션에 전송하는 절대 수량이다.
- **예약 재고 (`committed`)**: 주문 확정 후 발송 전 확보된 수량. 취소는 예약만 해제하고, 발송 성공 때만 해제와 `onHand` 차감을 함께 처리한다.
- **입고 예정 (`incoming`)**: 공장 공급 참고 수량이며 검수 전에는 `available` 및 채널 재고에 포함하지 않는다. 반품도 검수 입고 뒤에만 `onHand`를 복구한다.
- **공급자 외부 SKU (`SupplierExternalSku`)**: 특정 공장이 사용하는 정확한 재고 단위 식별자다. 색상·사이즈가 다르면 다른 외부 SKU이며 상품명 유사도로 연결하지 않는다.
- **입고 원본 (`InboundImport`)**: 파일 해시, 출고 고유번호, 원본 순서와 행을 보존하는 변경 불가 증빙이다. 재고나 `incoming`을 직접 바꾸지 않는다.
- **예정 입고 (`FactoryArrival`)**: 내부 판매·재고 단위와 창고 배정을 가진 예상 수령 aggregate다. 실제 입고 전의 운영 기준이며 원본 증빙과 분리한다.
- **창고 배정 (`FactoryArrivalAllocation`)**: 예정 입고 한 행의 수량을 하나 이상의 창고로 나눈 계획이다. 입고·부족 확정된 수량은 고정되고 남은 수량만 재배정한다.
- **입고 증빙 (`FactoryReceipt`)**: 검수 뒤 실제 재고를 증가시키는 불변 이벤트다. 정상 수량, 초과 수량, 부족 종료, 후속 입고와 정정의 연결을 보존한다.
- **차이 종료 (`VarianceClosure`)**: 더 이상 도착하지 않을 부족 수량을 사유와 함께 닫는 결정이다. 이후 물품은 원래 기대 수량을 다시 열지 않는 연결된 후속 입고로 기록한다.

## Ownership

- `/products`: 상품과 창고 기준정보
- `/orders`: 주문과 송장 업로드·분류·발송
- 재고 운영: 재고 목록, 이력, 수동 입고·출고
- `/settings`: 스토어 연결과 자격 증명

The detailed product and architectural rules remain in `docs/product/`, `docs/architecture/`, and the relevant ADRs.
