# ADR-031: 내부 SKU 중심의 명시적 채널 매핑과 재고 운영

**상태**: Accepted — ADR-030을 supersede한다. ADR-030은 이전 channel-first 상품 수집 결정의 역사 기록으로 보존한다.

**결정**: 내부 `ProductVariant`의 seller SKU와 실제 창고 수량이 source of truth다. 채널 상품 등록·수정·전량 수집은 Seleccase 범위 밖이며, 전량 채널 상품 수집은 canonical flow가 아니다.

`ChannelProductRef`는 사용자가 입력한 채널 판매 옵션 식별자와 내부 SKU의 명시적 매핑이다. 하나의 내부 SKU는 채널별 옵션을 여러 개 가질 수 있다. 매핑 입력은 판매자 SKU, 채널 상품 ID, 채널 옵션 ID를 받고 server action에서 존재를 검증한다. 상품명 유사도나 SKU 자동 연결을 하지 않는다. 지원 채널이 단일 옵션 조회를 제공하지 않으면 입력을 검증하고 미검증 상태를 명확히 남긴다.

공장 수량은 incoming/공급 참고 수량이며 검수 전에는 available 및 채널 재고에 포함하지 않는다. 주문 확정은 committed를 증가시키고 latest available absolute quantity를 두 채널의 모든 매핑 옵션에 반영한다. 발송 성공만 onHand를 차감한다. 취소는 예약만 해제하고, 반품은 검수 입고 뒤에만 onHand를 복구한다.

동기화 실패는 내부 원장을 되돌리지 않고 최신 absolute quantity를 재시도·재조정한다. 성공한 채널 응답만 channelReported를 갱신한다.

**이유**: 외부 카탈로그의 이름·SKU 변형으로 내부 재고를 추정하면 오연결과 재고 오류가 생긴다. 명시적 식별자 매핑은 감사 가능한 연결과 다중 옵션 판매를 지원하면서 실제 창고 수량을 안정적으로 유지한다.

**트레이드오프**: 매핑 입력과 검증 상태를 운영자가 관리해야 하며, 채널 카탈로그를 브라우즈하거나 채널에 상품을 게시하는 기능은 제공하지 않는다.
