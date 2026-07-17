# ADR-007: 송장 작업은 연결 설명이 아니라 주문 owner의 분류·발송 실행 surface다
**결정**: `/orders/tracking-import`는 `업로드 → 미리보기 → 분류 → 매칭/발송`만 소유한다. `/shipping`은 이 route로 redirect한다. 별도 `연동 준비 상태` 섹션은 두지 않는다. 채널별 발송 액션은 preview surface와 붙여서 다룬다.
**이유**: 연결 준비와 실행 흐름을 한 화면에서 반복 설명하면 작업 표면보다 안내 카드가 더 커진다.  
**트레이드오프**: 연결 부족 상태는 짧은 badge와 deep link로만 전달해야 한다.

