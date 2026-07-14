# Step 3: product-management-workspace

## 읽어야 할 파일
- `AGENTS.md`
- `docs/UI_GUIDE.md`
- `docs/COMPONENTS.md`
- `src/app/(protected)/products/page.tsx`
- `src/app/(protected)/master-data/MasterDataManager.tsx`
- `src/components/ui/basic-data-table.tsx`
- `src/components/ui/modal.tsx`
- `src/components/ui/channel-badge.tsx`
- `tests/products-page.test.ts`
- `tests/master-data-manager.test.ts`

## 작업
- Product workspace rendering/filter/interaction 테스트를 먼저 작성한다.
- `/products` 상품 탭을 ProductVariant row table로 전환한다. 기본 열은 상품/옵션, seller SKU, 고정된 쿠팡·네이버 ChannelBadge 슬롯, 내부 available, sync gap, last sync다. 창고 탭은 유지한다.
- 고정 보기 `전체 / 연결 필요 / 재고 불일치 / 판매 중지`를 compact filter로 제공한다. 범용 saved-view builder는 만들지 않는다.
- ChannelBadge 클릭과 row action은 shared Modal 또는 FixedSheet 하나를 열고 채널별 이미지, 가격, external IDs, 원문 상태, channelReported, sync error, 연결/해제를 보여준다. 공통 열에 채널별 전용 속성을 확장하지 않는다.
- toolbar에는 검색, 고정 보기, `동기화` 하나만 두고 동기화 결과 count를 inline meta로 표시한다.
- `linkVariant(channelProductRefId, variantId|null)` server action을 추가하고 사용자 ownership을 검증한다.
- 데이터가 아직 없을 때 기존 Model/Size/Color 관리 기능을 제거하지 말고 창고 탭과 최소 생성 modal을 보존한다.

## 완료 조건
- `npm run test -- --run tests/products-page.test.ts tests/master-data-manager.test.ts tests/product-management-workspace.test.ts`
- `npm run lint`

## 금지사항
- 채널 상품과 내부 상품을 별도 중복 table로 만들지 마라. 이유: ProductVariant가 단일 재고 참조 단위다.
- channel attribute 전체를 기본 열에 펼치지 마라. 이유: dense table의 가독성이 무너진다.
- page-local 색상/배지를 조립하지 마라. 이유: ChannelBadge/Badge가 canonical owner다.

## 결과 기록
완료 시 step 3을 completed로 바꾸고 table/drawer UX와 검증 결과를 summary에 기록한다.
