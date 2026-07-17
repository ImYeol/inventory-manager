# ADR-004A: FixedSheet는 portal과 명시적 overlay/content layering을 소유한다
**결정**: `FixedSheet`는 `Modal`과 같이 portal, body scroll lock, Escape close, 고유 title id를 소유한다. overlay는 content보다 낮은 stacking context를, sheet content는 더 높은 stacking context를 가져야 한다.
**이유**: overlay가 content보다 높으면 backdrop blur가 sheet 전체에 적용되어 입력 surface가 읽히지 않는다.
**트레이드오프**: primitive가 DOM lifecycle과 접근성 속성을 직접 관리한다.

