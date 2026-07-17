# ADR-005: 빠른 입력 overlay에서는 `표 붙여넣기`를 제거하고 editable table만 남긴다
**결정**: 수동 입출고 overlay는 compact editable table을 중심으로 하고 `표 붙여넣기`/bulk import panel은 CSV 경로로 이동시킨다.  
**이유**: 빠른 입력 팝업의 목표는 최소 필드로 빠르게 저장하는 것이지, 모든 입력 경로를 한 overlay에 몰아넣는 것이 아니다.  
**트레이드오프**: 대량 입력은 CSV 경로가 더 중요해진다.

