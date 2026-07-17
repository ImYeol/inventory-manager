# ADR-002: `재고 운영`은 하나의 first-level hub로 유지하고, 목록과 이력 중심으로 분산한다
**결정**: `재고 운영`은 1차 메뉴 하나로 유지하고, 목록·입고·출고를 중심으로 구성한다. 이력의 현재 canonical route는 top-level `/history`이며, CSV 또는 추가 감사 surface는 실제 필요가 생길 때 재고 운영 ownership 아래에서 분리한다.
**이유**: top-level을 다시 쪼개면 창고 담당자 흐름이 끊기지만, 모든 워크스페이스를 한 화면에 영구 고정하면 허브 자체가 과밀해진다.  
**트레이드오프**: inventory 내부 navigation과 top-level 이력 route 사이의 맥락 연결이 필요할 수 있다.

