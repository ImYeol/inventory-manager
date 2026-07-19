import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inboundTemplateSkuKey, validateInboundPreviewRows } from '@/lib/inbound'

describe('versioned inbound template contract', () => {
  it('keeps template versions out of exact supplier matching', () => {
    expect(inboundTemplateSkuKey({ supplierId: 4, templateId: 7, externalSku: ' EXT-1 ' })).toBe('4:EXT-1')
    expect(inboundTemplateSkuKey({ supplierId: 4, templateId: 7, externalSku: 'EXT-1' }))
      .toBe(inboundTemplateSkuKey({ supplierId: 4, templateId: 8, externalSku: 'EXT-1' }))
  })

  it('allows invalid preview rows to be saved, but excludes them from receipt validation', () => {
    expect(validateInboundPreviewRows([{ externalSku: '', quantity: null, validationError: '외부 SKU를 입력해주세요.', productVariantId: null }])).toEqual([])
    expect(validateInboundPreviewRows([{ externalSku: 'EXT-1', quantity: 3, validationError: null, productVariantId: 12 }])).toEqual([])
  })

  it('defines user-owned versioned templates, audit references, RLS, and private source storage', () => {
    const schema = readFileSync(resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')
    expect(schema).toContain('create table if not exists public.inbound_templates')
    expect(schema).toContain('create table if not exists public.inbound_template_versions')
    expect(schema).toContain('template_version_id bigint')
    expect(schema).toContain('create table if not exists public.supplier_sku_links')
    expect(schema).toContain('enable row level security')
    expect(schema).toContain("'inbound-source-files', 'inbound-source-files', false")
    expect(schema).toContain('security invoker set search_path =')
  })

  it('keeps inactive templates in Settings history while limiting new inbound selection and previews to active templates', () => {
    const data = readFileSync(resolve(process.cwd(), 'src/lib/data.ts'), 'utf8')
    const actions = readFileSync(resolve(process.cwd(), 'src/lib/actions/inbound-import.ts'), 'utf8')

    expect(data).toContain('export async function getInboundTemplates(supplierId: number)')
    expect(data).toContain(".eq('is_active', true)")
    expect(actions).toContain('export async function setInboundTemplateActive')
    expect(actions).toContain(".from('inbound_templates').update({ is_active: input.active })")
    expect(actions).toContain("if (!template.active) throw new Error('비활성 템플릿은 새 입고에 사용할 수 없습니다.')")
  })
})
