# ADR-030: 상품 관리는 channel-first table과 내부 상품 보조 flow를 사용한다
**결정**: `/products`는 variants가 비어도 채널 상품 table을 canonical surface로 렌더한다. unlinked `ChannelProductRef`는 `연결 필요` 행으로 남기고, 연결은 명시적인 variant 선택 또는 exact seller SKU 제안으로만 한다. 내부 상품은 local-only server action으로 bounded variant/SKU 조합을 만든다.
**이유**: 외부 상품 원문과 내부 재고 단위를 분리하면서, 누락된 매핑을 실제 작업 표면에서 처리할 수 있다.
**트레이드오프**: 채널 sync 전의 빈 표도 유지되며, 내부 상품 등록에는 조합 수 validation이 필요하다.
