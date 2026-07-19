-- feat-template-management-builder(231aa8e)가 운영 DB에만 적용하고 병합되지 않은 스키마를
-- 현재 브랜치 기준으로 되돌린다. 해당 브랜치는 폐기됐고, ADR-035의 입고처 바인딩이 그 자리를
-- 대신한다. 원격에만 존재하던 두 마이그레이션 파일도 함께 복원해 이력을 일직선으로 만든다.
drop table if exists public.template_custom_fields cascade;

drop index if exists public.template_definitions_user_type_name_idx;
drop index if exists public.template_definitions_active_type_idx;

alter table public.inbound_template_versions drop column if exists business_type;
alter table public.inbound_templates drop column if exists business_type;

-- business_type 유니크 인덱스로 교체되면서 사라졌던 원래 제약을 복원한다.
alter table public.inbound_templates drop constraint if exists inbound_templates_user_id_name_key;
alter table public.inbound_templates add constraint inbound_templates_user_id_name_key unique (user_id, name);
