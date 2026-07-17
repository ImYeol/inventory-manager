# ADR-020: list-management screens는 toolbar 다음 primary table을 기본 surface로 둔다
**결정**: 목록 관리 화면은 toolbar 뒤 primary table을 canonical 작업 surface로 둔다.
**이유**: 운영자가 빠르게 필터를 바꾸고 표를 읽는 화면에서는 설명 chrome이 반복될수록 작업 표면이 늦게 보인다.  
**트레이드오프**: page-level context가 필요한 경우에도 한 번만 보여주도록 헤더와 toolbar 메타를 정리해야 한다.

운영 규칙 세부는 UI Guide의 [Layout Rules](../design/ui-guide.md#layout-rules)와 [페이지 chrome 예산](../design/ui-guide.md#페이지-chrome-예산)을 참조한다.

