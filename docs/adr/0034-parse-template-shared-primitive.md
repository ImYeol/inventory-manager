# ADR-034: 파싱 템플릿은 공유 primitive이며 관리는 설정이 소유한다

> **Superseded (부분)**: 입고 파싱 템플릿의 관리 위치는 [ADR-035](./0035-inbound-supplier-is-shipping-list-issuer.md)가 대체한다 — `inbound_templates.supplier_id`가 NOT NULL이 되면서 템플릿은 입고처에 종속되므로, 관리 UI도 설정이 아니라 입고처 상세 modal(`소싱 > 입고처`)로 옮긴다. 공유 primitive(`ParseTemplateBuilder`)와 도메인별 저장 계층 분리 결정은 그대로 유효하다.

**결정**: 파일 → 시트/헤더 행 선택 → 컬럼-역할 매핑 → 미리보기로 이어지는 파싱 흐름은 `src/components/ui/parse-template-builder.tsx`의 `ParseTemplateBuilder` 공유 primitive 하나로 수렴한다. 역할 스키마(`ParseTemplateRole[]`)를 파라미터로 받아 입고(`외부 SKU`·`수량`, `InboundRegistrationSheet`)와 주문 송장(`운송장번호`·`주문번호`·`수취인` 등, `tracking-import-workspace`)이 이 컴포넌트 하나를 소비한다. 헤더 지문 자동 매칭(`headerFingerprint`/`matchPresetByHeaders`)은 primitive가 소유하며, 두 도메인 모두 이를 통해 저장된 프리셋/템플릿을 자동 선택받는다.

파싱 템플릿의 **관리**(전체 목록·수정·새 버전·프리셋 복제)는 `/settings/parse-templates`에서 이뤄진다(ADR-006이 확립한 "설정은 cross-cutting 설정을 소유한다" 원칙의 연장이며, ADR-002가 경계하는 top-level 메뉴 과밀은 기존 `/settings` 아래 sub-route로 만들어 피한다). 각 가져오기 화면(입고 예정의 엑셀 가져오기, 주문 송장 가져오기)은 인라인 파싱 템플릿 선택과 급조(quick-create)만 유지하고, 목록·버전 이력·프리셋 관리 UI를 자체로 다시 만들지 않는다.

파싱 템플릿의 **저장 계층은 도메인별로 유지**한다. 입고는 기존 `inbound_templates`/`inbound_template_versions`(불변 버전, ADR-032의 `InboundImport` 증빙과 연결된 매핑 이력)를 그대로 쓰고, 주문 송장은 기존 `tracking_import_templates`의 `column_mapping` JSON(빌트인 불변 프리셋 + 사용자 저장 프리셋, 헤더 지문 자동 매칭)을 그대로 쓴다. 두 저장소를 하나의 물리 테이블로 병합하지 않는다.

**이유**: 입고와 주문 송장은 "파일 → 시트/헤더 → 컬럼 매핑 → 미리보기"라는 동일한 상호작용 패턴을 각자 손으로 다시 구현하고 있었다(중복·표류 위험). 반면 두 도메인의 저장 의미는 다르다 — 입고는 `InboundImport` 증빙과 묶인 불변 버전 이력이 SoT여야 하고(ADR-032), 주문 송장은 빌트인 불변 프리셋 + 사용자 프리셋이라는 다른 수명주기를 가진다. 상호작용 계층만 공유 primitive로 올리고 저장 계층은 도메인 소유로 남기면 중복은 없어지고 도메인 불변식은 유지된다. 관리 UI를 설정에 모으는 것은 "소유 vs 소비" 경계를 파싱 템플릿에도 동일하게 적용한 것이다(창고 기준정보가 상품 관리 소유·재고 운영 소비이듯, 파싱 템플릿은 설정 소유·각 가져오기 화면 소비).

**트레이드오프**: `ParseTemplateBuilder`는 두 역할 스키마가 요구하는 최소 공통분모(시트/헤더 선택, 컬럼-역할 매핑, 미리보기, 프리셋 자동 매칭)만 소유하므로, 도메인별 고유 로직(입고의 2단계 승격 stepper, 주문 송장의 발송 후 처리)은 각 화면이 별도로 소유해야 한다. 설정의 관리 화면은 각 가져오기 화면의 인라인 급조와 일부 UI를 다시 그리므로 완전한 단일 구현은 아니다 — 이는 "관리 vs 인라인 사용"이 다른 화면 책임이라는 선택에 따른 의도된 중복이다.
