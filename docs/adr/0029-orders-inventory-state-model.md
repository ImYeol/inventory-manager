# ADR-029: 주문과 송장 작업은 `/orders`로 수렴하고 재고는 예약과 절대 수량 동기화로 관리한다
**결정**: primary navigation의 canonical IA는 `대시보드 / 주문 / 상품 관리 / 재고 운영 / 소싱`이다. `/settings`는 primary navigation이 아닌 계정 메뉴의 `API 설정` deep link(`/settings?section=store-connections`)로 접근하는 스토어 연결 owner다. `/orders`는 주문과 송장 작업의 owner이고, `/shipping`은 `/orders/tracking-import`로 redirect한다. `ProductVariant`는 판매·재고 단위, `ChannelProductRef`는 채널 상품/옵션 참조다. 재고는 `onHand`, `committed`, `available`, `incoming`, `channelReported`로 분리한다.

`available = onHand - committed`이며 `incoming`은 보유 수량에 더하지 않는다. 주문 확정은 예약(`committed` 증가)만 원자적으로 반영한다. 외부 발송 성공 후에만 예약 해제와 `onHand` 차감을 같은 원자적 작업으로 수행한다. 채널 동기화는 delta가 아닌 `available`의 절대 수량을 전송하고, 성공 후에만 `channelReported`를 갱신한다.

**이유**: 주문·송장 실행 위치를 하나로 정하고, 외부 실패/재시도에서 재고가 이중 차감되는 일을 막으며, 채널의 절대 수량을 내부 판매 가능 수량과 일관되게 맞춘다.

**트레이드오프**: 예약, 발송 성공, 채널 성공 응답을 각기 독립된 상태 전이로 구현해야 하므로 이후 schema와 action의 트랜잭션 경계가 명확해야 한다.

