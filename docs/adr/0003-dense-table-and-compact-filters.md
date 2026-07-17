# ADR-003: list/history는 dense table + compact filters가 canonical surface다
**결정**: 재고 운영의 canonical surface는 summary card-first가 아니라 `compact filter toolbar + dense data table` 구조다. 목록은 현재 재고를, 이력은 변동 기록을 먼저 보여준다.  
**이유**: 실제 작업은 창고, 상품명, 상태, 컬럼 가시성 변경과 표 읽기에서 발생한다.  
**트레이드오프**: glanceable KPI는 secondary badge strip 정도로 축소해야 한다.

