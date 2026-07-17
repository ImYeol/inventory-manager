# ADR-006: 스토어 연결은 설정 소유로 수렴한다
**결정**: 네이버/쿠팡 연결 상태와 credential 편집의 canonical owner는 `/settings`다. primary navigation에는 설정을 두지 않고, 계정 메뉴의 `API 설정` deep link(`/settings?section=store-connections`)로 진입한다. `/integrations`는 `redirect('/settings')`로 수렴하며, thin alias는 redirect 전 과도기 조치로만 허용한다.
**이유**: `IntegrationsView`와 `SettingsView`가 동시에 스토어 연결을 설명하면 IA가 중복되고, 사용자는 어디서 연결을 바꾸는지 헷갈린다.  
**트레이드오프**: 기존 `/integrations` 링크는 호환 경로 또는 redirect 처리가 필요하다.

