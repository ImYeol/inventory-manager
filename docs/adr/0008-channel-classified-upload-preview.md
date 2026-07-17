# ADR-008: 업로드 미리보기의 canonical row state는 channel classification이다
**결정**: 엑셀 업로드 뒤 첫 번째 핵심 표는 원본 데이터 단순 출력이 아니라 `네이버/쿠팡/미분류/중복 후보` 분류가 포함된 preview table이어야 한다.  
**이유**: 사용자는 어떤 행이 어느 채널로 갈지 바로 보고 필터링해야 한다.  
**트레이드오프**: name/address normalization과 ambiguous state 처리가 필요하다.

