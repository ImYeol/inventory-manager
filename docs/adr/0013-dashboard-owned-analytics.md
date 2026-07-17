# ADR-013: 분석은 독립 1차 메뉴가 아니라 dashboard 내부 section으로 둔다
**결정**: `분석`은 sidebar direct item으로 두지 않고 dashboard 내부 section으로 흡수한다. `/analytics`는 legacy redirect만 유지한다.  
**이유**: KPI와 분석 차트가 같은 operational context를 설명하는데 메뉴와 화면을 분리하면 지표가 중복되고 탐색 비용만 늘어난다.  
**트레이드오프**: dashboard props와 analytics action 시그니처가 조금 더 커진다.

