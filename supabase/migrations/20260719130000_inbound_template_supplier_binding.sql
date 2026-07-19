-- 입고처(공급자)와 입고 파싱 템플릿을 N:1로 묶는다. 하나의 입고처가 여러 템플릿을 가질 수 있지만
-- 템플릿은 항상 정확히 하나의 입고처(파일을 발행하는 공장 또는 배대지)에 속한다.
--
-- inbound_import_revisions가 템플릿을 on delete restrict로 참조하므로 기존 행을 지우면
-- 입고 증빙 이력이 함께 무너진다. 따라서 삭제 대신 nullable 추가 → 백필 → not null 승격
-- 순서로 올린다. 기존 행이 없으면 백필은 그대로 no-op이다.
alter table public.inbound_templates add column if not exists supplier_id bigint;

-- 바인딩 이전에 만들어진 템플릿은 소유 입고처가 기록돼 있지 않다. 계정별 최초 입고처로
-- 귀속시켜 이력을 보존한다. 운영자는 이후 화면에서 올바른 입고처로 옮길 수 있다.
update public.inbound_templates t
set supplier_id = (select f.id from public.factories f where f.user_id = t.user_id order by f.id limit 1)
where t.supplier_id is null;

-- 입고처가 하나도 없는 계정의 고아 템플릿만 남는다. 여기서 실패하면 수동 정리가 필요하다는
-- 신호이므로, 조용히 지우지 않고 not null 승격이 오류를 내도록 둔다.
alter table public.inbound_templates alter column supplier_id set not null;

alter table public.inbound_templates
  add constraint inbound_templates_supplier_user_id_fkey
  foreign key (supplier_id, user_id) references public.factories(id, user_id) on delete restrict;

create index if not exists inbound_templates_supplier_idx
  on public.inbound_templates(user_id, supplier_id, is_active, name);
