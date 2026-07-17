# ADR-015: provider 연결 상태는 dot + label primitive로 통일한다
**결정**: 네이버/쿠팡 연결 상태는 shared `StoreConnectionStatus` primitive 하나로 표현한다. 연결됨은 초록 dot, 미연결은 빨강 dot를 사용한다.  
**이유**: settings와 shipping에서 상태 표현이 갈라지면 같은 상태를 다른 배지 언어로 읽게 된다.  
**트레이드오프**: 기존 status badge 기반 UI는 일부 밀도 조정이 필요하다.

