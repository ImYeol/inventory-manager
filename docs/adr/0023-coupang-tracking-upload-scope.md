# ADR-023: 쿠팡 운송장 업로드는 기본 택배사 코드 + 일반배송 v1로 고정한다
**결정**: 쿠팡 운송장 업로드는 설정의 `defaultDeliveryCompanyCode`를 사용하고, `shipmentBoxId + orderId + vendorItemId` 단위의 `orderSheetInvoiceApplyDtos[]` payload로 전송한다. v1 범위에서는 `splitShipping=false`, `preSplitShipped=false`, `estimatedShippingDate=""`의 일반배송만 지원한다.  
**이유**: 현재 운송장 화면의 핵심 목적은 엑셀 업로드 후 빠르게 분류하고 반영하는 것이다. 행별 택배사 코드 입력이나 분리배송 UI까지 한 번에 열면 preview toolbar와 row state가 과도하게 복잡해진다.  
**트레이드오프**: 분리배송과 행별 택배사 지정은 후속 범위로 남기고, 현재는 설정의 기본값과 item-level payload로 안정적으로 수렴한다.

