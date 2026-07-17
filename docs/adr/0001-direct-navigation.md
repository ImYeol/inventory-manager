# ADR-001: 메뉴는 사용 맥락 중심 direct item을 우선하고, local section은 실제 child screen이 있을 때만 쓴다
**결정**: top-level 메뉴는 사용자가 자주 가는 목적지를 direct item으로 둔다. 확장형은 실제 child screen이 2개 이상일 때만 사용하고, 나머지는 local section이나 page internal nav로 처리한다.  
**이유**: 화면 수를 맞추기 위한 category는 사용자가 찾는 경로를 길게 만든다.  
**트레이드오프**: 일부 도메인은 top-level item이 아니라 local navigation으로 풀어야 한다.

