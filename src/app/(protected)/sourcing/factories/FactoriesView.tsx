'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fieldConfig, ZodProvider } from '@autoform/zod'
import { AutoForm } from '@autoform/react/react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { createFactory, setFactoryActive } from '@/lib/actions'
import { createInboundTemplateVersion, getInboundTemplatesForSupplier, inspectInboundTemplateSample, setInboundTemplateActive, type InboundTemplateSample } from '@/lib/actions/inbound-import'
import { StatusBadge } from '@/components/ui/badge-1'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { FileDropInput } from '@/components/ui/file-drop-input'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ParseTemplateBuilder } from '@/components/ui/parse-template-builder'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, cx, ui } from '@/app/components/ui'
import { autoFormUiComponents } from '@/components/ui/autoform/ui-components'
import { autoFormFieldComponents } from '@/components/ui/autoform/form-components'

type InboundParseTemplateRow = { id: number; name: string; versionId: number; versionNumber: number; active: boolean }

const inboundRoles = [{ key: 'externalSku' as const, label: '외부 SKU', required: true }, { key: 'quantity' as const, label: '수량', required: true }]

const versionFormSchema = z.object({
  name: z.string().trim().min(1, '파싱 템플릿 이름을 입력하세요.'),
  sheetName: z.string().trim().min(1, '시트를 선택하세요.'),
  headerRowNumber: z.coerce.number().int('헤더 행은 정수여야 합니다.').min(1, '헤더 행은 1 이상이어야 합니다.'),
  mapping: z.object({
    externalSku: z.string().trim().min(1, '외부 SKU 열을 선택하세요.'),
    quantity: z.string().trim().min(1, '수량 열을 선택하세요.'),
  }),
  customMappings: z.array(
    z.object({ key: z.string(), name: z.string(), column: z.string() }),
  ),
})

type VersionFormValues = z.output<typeof versionFormSchema>
type VersionFormInput = z.input<typeof versionFormSchema>

const versionFormDefaults: VersionFormValues = {
  name: '',
  sheetName: '',
  headerRowNumber: 1,
  mapping: { externalSku: '', quantity: '' },
  customMappings: [],
}

// AutoForm(zod 스키마 기반 자동 폼 생성기, 이슈 #31 실험) 실험 대상 스키마.
// 기존 필수/선택 규칙(이름만 필수, 나머지는 선택)을 그대로 유지한다.
const factoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '입고처 이름을 입력하세요.')
    .check(fieldConfig({ label: '입고처 이름', inputProps: { placeholder: '예: 광주 봉제 협력사' } })),
  contactName: z
    .string()
    .trim()
    .check(fieldConfig({ label: '담당자', inputProps: { placeholder: '담당자 이름' } }))
    .optional(),
  phone: z
    .string()
    .trim()
    .check(fieldConfig({ label: '전화번호', inputProps: { placeholder: '010-0000-0000' } }))
    .optional(),
  email: z
    .string()
    .trim()
    .check(fieldConfig({ label: '이메일', inputProps: { placeholder: 'factory@example.com' } }))
    .optional(),
  notes: z
    .string()
    .trim()
    .check(
      fieldConfig({ label: '메모', fieldType: 'textarea', inputProps: { placeholder: '납기 메모, 연락 가능 시간, 특이사항' } }),
    )
    .optional(),
})

type FactoryFormValues = z.output<typeof factoryFormSchema>

const factoryFormProvider = new ZodProvider(factoryFormSchema)

type FactoryData = {
  id: number
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isActive: boolean
  arrivalCount: number
  pendingQuantity: number
}

type FactorySourcingItem = {
  expectedDate: string
  status: string
  modelName: string
  sizeName: string
  colorName: string
  orderedQuantity: number
  receivedQuantity: number
  remainingQuantity: number
}

type SourcingSchemaState = {
  status: 'ready' | 'missing'
  message: string | null
}

type FactoryStatusFilter = 'all' | 'active' | 'inactive'

function normalize(value: string | null) {
  return value?.toLowerCase().trim() ?? ''
}

function getArrivalStatusTone(status: string) {
  if (status === '예정') return 'info'
  if (status === '부분입고') return 'warning'
  if (status === '입고완료') return 'success'
  return 'neutral'
}

export default function FactoriesView({
  factories,
  schemaState,
  factorySourcingItems,
}: {
  factories: FactoryData[]
  schemaState: SourcingSchemaState
  factorySourcingItems: Record<number, FactorySourcingItem[]>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FactoryStatusFilter>('all')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [registerFormError, setRegisterFormError] = useState<string | null>(null)
  const [selectedFactoryId, setSelectedFactoryId] = useState<number | null>(null)

  const [templates, setTemplates] = useState<InboundParseTemplateRow[]>([])
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null)
  const [versionModal, setVersionModal] = useState<InboundParseTemplateRow | 'new' | null>(null)
  const [versionSample, setVersionSample] = useState<InboundTemplateSample | null>(null)

  const versionForm = useForm<VersionFormInput, unknown, VersionFormValues>({
    resolver: zodResolver(versionFormSchema),
    defaultValues: versionFormDefaults,
  })
  const { control: versionControl, register: registerVersionField, handleSubmit: handleVersionSubmit, reset: resetVersionForm, setValue: setVersionFieldValue, setError: setVersionFieldError, formState: { errors: versionErrors } } = versionForm
  const sheetNameField = useController({ control: versionControl, name: 'sheetName' })
  const headerRowField = useController({ control: versionControl, name: 'headerRowNumber' })
  const mappingField = useController({ control: versionControl, name: 'mapping' })
  const customMappingsField = useController({ control: versionControl, name: 'customMappings' })

  useEffect(() => {
    let active = true
    const request = selectedFactoryId === null ? Promise.resolve([]) : getInboundTemplatesForSupplier(selectedFactoryId)
    request
      .then((rows) => { if (active) { setTemplates(rows); setTemplateLoadError(null) } })
      .catch((error) => { if (active) { setTemplates([]); setTemplateLoadError(error instanceof Error ? error.message : '파싱 템플릿을 불러오지 못했습니다.') } })
    return () => { active = false }
  }, [selectedFactoryId])

  const openNewVersion = (template: InboundParseTemplateRow | 'new') => {
    setVersionModal(template)
    setVersionSample(null)
    resetVersionForm({ ...versionFormDefaults, name: template === 'new' ? '' : template.name })
    setMessage(null)
  }

  const inspectVersionSample = (file: File) => startTransition(async () => {
    try {
      const result = await inspectInboundTemplateSample(file)
      setVersionSample(result)
      setVersionFieldValue('sheetName', result.sheets[0]?.name ?? '')
      setVersionFieldValue('headerRowNumber', 1)
      setVersionFieldValue('mapping', { externalSku: '', quantity: '' })
      setVersionFieldValue('customMappings', [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '샘플 파일을 읽지 못했습니다.')
    }
  })

  const saveVersion = handleVersionSubmit((values) => {
    const sheet = versionSample?.sheets.find((candidate) => candidate.name === values.sheetName)
    if (!sheet || selectedFactoryId === null) {
      setVersionFieldError('root', { message: '샘플 파일을 먼저 업로드하세요.' })
      return
    }
    const templateId = versionModal !== 'new' && versionModal ? versionModal.id : undefined
    startTransition(async () => {
      try {
        await createInboundTemplateVersion({
          templateId,
          supplierId: selectedFactoryId,
          name: values.name,
          sheetName: sheet.name,
          headerRowNumber: values.headerRowNumber,
          headers: sheet.rows[values.headerRowNumber - 1] ?? [],
          mappings: {
            externalSku: values.mapping.externalSku,
            quantity: values.mapping.quantity,
            source: Object.fromEntries(values.customMappings.filter((row) => row.name.trim() && row.column).map((row) => [row.name.trim(), row.column])),
          },
        })
        setVersionModal(null)
        setMessage('입고 파싱 템플릿 버전을 저장했습니다.')
        const rows = await getInboundTemplatesForSupplier(selectedFactoryId)
        setTemplates(rows)
        router.refresh()
      } catch (error) {
        setVersionFieldError('root', { message: error instanceof Error ? error.message : '파싱 템플릿을 저장하지 못했습니다.' })
      }
    })
  })

  const toggleInboundTemplate = (template: InboundParseTemplateRow) => {
    if (selectedFactoryId === null) return
    startTransition(async () => {
      try {
        await setInboundTemplateActive({ templateId: template.id, active: !template.active })
        setMessage(template.active ? '입고 파싱 템플릿 사용을 중지했습니다.' : '입고 파싱 템플릿을 사용합니다.')
        const rows = await getInboundTemplatesForSupplier(selectedFactoryId)
        setTemplates(rows)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '입고 템플릿 사용 상태를 변경하지 못했습니다.')
      }
    })
  }

  const inboundTemplateColumns: ColumnDef<InboundParseTemplateRow, unknown>[] = [
    { id: 'name', header: '이름', enableSorting: false, cell: ({ row }) => <span className="font-medium text-[color:var(--foreground)]">{row.original.name}</span> },
    { id: 'version', header: '최신 버전', enableSorting: false, cell: ({ row }) => <span className="tabular-nums text-[color:var(--muted-foreground)]">v{row.original.versionNumber}</span> },
    { id: 'status', header: '상태', enableSorting: false, cell: ({ row }) => <StatusBadge tone={row.original.active ? 'success' : 'neutral'}>{row.original.active ? '사용 중' : '사용 중지'}</StatusBadge> },
    {
      id: 'action',
      header: () => <span className="sr-only">작업</span>,
      enableSorting: false,
      meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
      cell: ({ row }) => <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openNewVersion(row.original)}>새 버전 만들기</Button><Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => toggleInboundTemplate(row.original)}>{row.original.active ? '사용 중지' : '사용'}</Button></div>,
    },
  ]

  const filteredFactories = useMemo(() => {
    const query = search.toLowerCase().trim()

    return factories.filter((factory) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? factory.isActive : !factory.isActive)

      const haystack = [
        factory.name,
        factory.contactName,
        factory.phone,
        factory.email,
        factory.notes,
      ]
        .map(normalize)
        .join(' ')

      const matchesSearch = query.length === 0 || haystack.includes(query)
      return matchesStatus && matchesSearch
    })
  }, [factories, search, statusFilter])

  const selectedFactory = useMemo(
    () => (selectedFactoryId === null ? null : factories.find((factory) => factory.id === selectedFactoryId) ?? null),
    [factories, selectedFactoryId],
  )
  const selectedFactorySourcingItems = selectedFactory ? factorySourcingItems[selectedFactory.id] ?? [] : []

  const openDetail = (factoryId: number) => {
    setSelectedFactoryId(factoryId)
  }

  const submitFactory = (values: FactoryFormValues) => {
    setRegisterFormError(null)
    startTransition(async () => {
      try {
        const created = await createFactory(values)
        setIsRegisterOpen(false)
        setMessage('입고처를 등록했습니다. 이어서 파싱 템플릿을 등록하세요.')
        // 등록 폼에는 템플릿을 넣지 않는다(샘플 파일이 없을 수 있다). 대신 상세를 바로 열어
        // 파싱 템플릿 섹션으로 이어지게 한다.
        setSelectedFactoryId(created.id)
        router.refresh()
      } catch (error) {
        setRegisterFormError(error instanceof Error ? error.message : '입고처 등록에 실패했습니다.')
      }
    })
  }

  const toggleFactory = (factoryId: number, nextActive: boolean) => {
    startTransition(async () => {
      try {
        await setFactoryActive(factoryId, nextActive)
        setMessage(nextActive ? '입고처를 다시 활성화했습니다.' : '입고처를 비활성화했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '입고처 상태 변경에 실패했습니다.')
      }
    })
  }

  const factoryColumns: ColumnDef<FactoryData, unknown>[] = [
    {
      accessorKey: 'name',
      header: '입고처',
      enableHiding: false,
      meta: {
        headerClassName: 'w-[18rem]',
        cellClassName: 'max-w-[18rem] font-medium text-[color:var(--foreground)]',
      },
      cell: ({ row }) => (
        <>
          <button
            type="button"
            onClick={() => openDetail(row.original.id)}
            className="w-full truncate text-left font-medium text-[color:var(--foreground)] hover:underline"
          >
            {row.original.name}
          </button>
          {row.original.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-[color:var(--muted-foreground)]">{row.original.notes}</p>
          ) : null}
        </>
      ),
    },
    {
      id: 'contact',
      accessorFn: (row) => [row.contactName, row.phone, row.email].filter(Boolean).join(' · '),
      header: '연락처',
      meta: {
        headerClassName: 'w-[18rem]',
        cellClassName: 'max-w-[18rem] break-words',
      },
      cell: ({ getValue }) => (getValue<string>() || '연락처 정보 없음'),
    },
    {
      accessorKey: 'arrivalCount',
      header: '예정 입고',
      meta: {
        headerClassName: 'w-[7rem] text-right',
        cellClassName: 'w-[7rem] text-right font-semibold tabular-nums text-[color:var(--foreground)]',
      },
      cell: ({ getValue }) => `${getValue<number>()}건`,
    },
    {
      accessorKey: 'pendingQuantity',
      header: '잔여',
      meta: {
        headerClassName: 'w-[7rem] text-right',
        cellClassName: 'w-[7rem] text-right font-semibold tabular-nums text-[color:var(--foreground)]',
      },
      cell: ({ getValue }) => `${getValue<number>()}개`,
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      meta: {
        headerClassName: 'w-[7rem]',
        cellClassName: 'w-[7rem] align-middle',
      },
      cell: ({ getValue }) => (
        <StatusBadge tone={getValue<boolean>() ? 'success' : 'neutral'} className="px-2.5 py-1">
          {getValue<boolean>() ? '활성' : '비활성'}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">작업</span>,
      enableSorting: false,
      enableHiding: false,
      meta: {
        headerClassName: 'w-[6rem] text-right',
        cellClassName: 'w-[6rem] text-right',
      },
      cell: ({ row }) => (
        <Button type="button" variant="secondary" size="sm" onClick={() => openDetail(row.original.id)}>
          상세
        </Button>
      ),
    },
  ]

  return (
    <div className={ui.shell}>
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">대시보드</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sourcing">소싱</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>입고처</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader title="입고처" description="입고처 목록을 검색하고 상태를 걸러서 상세 정보와 등록 작업을 빠르게 처리합니다." />

      {schemaState.status === 'missing' && schemaState.message ? (
        <Card variant="muted" className="mb-4 overflow-hidden">
          <CardContent className="px-4 py-3 text-sm font-medium text-[color:var(--muted-foreground)]">{schemaState.message}</CardContent>
        </Card>
      ) : null}

      {message ? (
        <Card variant="muted" className="mb-4 overflow-hidden">
          <CardContent className="px-4 py-3 text-sm text-[color:var(--muted-foreground)]">{message}</CardContent>
        </Card>
      ) : null}

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter((value ?? 'all') as FactoryStatusFilter)} className="mb-3">
        <TabsList aria-label="입고처 상태 필터">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="active">활성</TabsTrigger>
          <TabsTrigger value="inactive">비활성</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={factoryColumns}
        rows={filteredFactories}
        tableAriaLabel="입고처 목록"
        emptyState="조건에 맞는 입고처가 없습니다."
        getRowDataState={(factory) => (factory.id === selectedFactory?.id ? 'selected' : undefined)}
        toolbarStart={
          <div className="w-full sm:w-[18rem] lg:max-w-[22rem] lg:flex-1">
            <label htmlFor="factory-search" className="sr-only">
              입고처 검색
            </label>
            <Input
              id="factory-search"
              type="search"
              placeholder="입고처명, 연락처, 메모 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="ui-control-sm"
            />
          </div>
        }
        toolbarEnd={
          <Button
            type="button"
            onClick={() => {
              if (schemaState.status === 'ready') {
                setIsRegisterOpen(true)
              }
            }}
            size="sm"
            className="h-9 px-3"
            disabled={schemaState.status === 'missing'}
          >
            입고처 등록
          </Button>
        }
      />

      <Modal
        open={selectedFactory !== null}
        title={selectedFactory?.name ?? '입고처 상세'}
        description={selectedFactory ? '입고처 정보와 열려 있는 상품 소싱 내역을 확인합니다.' : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFactoryId(null)
          }
        }}
        footer={
          selectedFactory ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => toggleFactory(selectedFactory.id, !selectedFactory.isActive)}>
                {selectedFactory.isActive ? '비활성화' : '다시 활성화'}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedFactory ? (
          <div className="space-y-4">
            {schemaState.status === 'missing' && schemaState.message ? (
              <Card variant="muted" className="overflow-hidden">
                <CardContent className="px-4 py-3 text-sm font-medium text-[color:var(--muted-foreground)]">{schemaState.message}</CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={selectedFactory.isActive ? 'success' : 'neutral'} className="px-2.5 py-1">
                {selectedFactory.isActive ? '활성' : '비활성'}
              </StatusBadge>
              <span className={ui.pillMuted}>예정 {selectedFactory.arrivalCount}건</span>
              <span className={ui.pillMuted}>잔여 {selectedFactory.pendingQuantity}개</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card variant="default" className="overflow-hidden">
                <CardContent className="px-4 py-3">
                  <dl className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">담당자</dt>
                    <dd className="text-sm font-medium text-[color:var(--foreground)]">{selectedFactory.contactName || '없음'}</dd>
                  </dl>
                </CardContent>
              </Card>
              <Card variant="default" className="overflow-hidden">
                <CardContent className="px-4 py-3">
                  <dl className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">전화번호</dt>
                    <dd className="text-sm font-medium text-[color:var(--foreground)]">{selectedFactory.phone || '없음'}</dd>
                  </dl>
                </CardContent>
              </Card>
              <Card variant="default" className="overflow-hidden">
                <CardContent className="px-4 py-3">
                  <dl className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">이메일</dt>
                    <dd className="text-sm font-medium text-[color:var(--foreground)]">{selectedFactory.email || '없음'}</dd>
                  </dl>
                </CardContent>
              </Card>
              <Card variant="default" className="overflow-hidden">
                <CardContent className="px-4 py-3">
                  <dl className="space-y-1">
                    <dt className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">메모</dt>
                    <dd className="text-sm font-medium text-[color:var(--foreground)]">{selectedFactory.notes || '없음'}</dd>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[color:var(--foreground)]">파싱 템플릿</h3>
                <Button type="button" size="sm" onClick={() => openNewVersion('new')}>새 파싱 템플릿</Button>
              </div>
              {templateLoadError ? <p role="alert" className="text-sm font-medium text-[color:var(--warning-foreground)]">{templateLoadError}</p> : null}
              <DataTable<InboundParseTemplateRow>
                bare
                tableAriaLabel="파싱 템플릿"
                columns={inboundTemplateColumns}
                rows={templates}
                rowAriaLabel={(template) => template.name}
                emptyState="등록된 입고 파싱 템플릿이 없습니다."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[color:var(--foreground)]">상품 소싱 내역</h3>
                <span className={cx(ui.pillMuted, 'tabular-nums')}>열림 {selectedFactorySourcingItems.length}건</span>
              </div>

              <div className={ui.tableShell}>
                <div className="overflow-x-auto">
                  <Table aria-label="상품 소싱 내역">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[8rem]">예정일</TableHead>
                        <TableHead>상품</TableHead>
                        <TableHead className="w-[10rem]">옵션</TableHead>
                        <TableHead className="w-[7rem]">상태</TableHead>
                        <TableHead className="w-[6rem] text-right">주문</TableHead>
                        <TableHead className="w-[6rem] text-right">받은</TableHead>
                        <TableHead className="w-[6rem] text-right">잔여</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFactorySourcingItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                            열려 있는 소싱 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedFactorySourcingItems.map((item, index) => (
                          <TableRow key={`${item.expectedDate}-${item.modelName}-${item.sizeName}-${item.colorName}-${index}`}>
                            <TableCell className="font-medium text-[color:var(--foreground)]">{item.expectedDate}</TableCell>
                            <TableCell className="font-medium text-[color:var(--foreground)]">{item.modelName}</TableCell>
                            <TableCell>{item.colorName} / {item.sizeName}</TableCell>
                            <TableCell>
                              <StatusBadge tone={getArrivalStatusTone(item.status)} className="px-2.5 py-1">
                                {item.status}
                              </StatusBadge>
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums text-[color:var(--foreground)]">{item.orderedQuantity}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums text-[color:var(--foreground)]">{item.receivedQuantity}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-[color:var(--foreground)]">{item.remainingQuantity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={versionModal !== null}
        title={versionModal === 'new' ? '새 입고 파싱 템플릿' : `${versionModal ? versionModal.name : ''} 새 버전`}
        description="샘플 파일에서 시트·헤더 행과 외부 SKU, 수량 열을 선택해 새 버전으로 저장합니다."
        onOpenChange={(open) => { if (!open) setVersionModal(null) }}
        footer={<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVersionModal(null)}>닫기</Button><Button type="button" disabled={isPending || !versionSample} onClick={saveVersion}>버전 저장</Button></div>}
      >
        <div className="space-y-4">
          {versionErrors.root?.message ? <p role="alert" className="text-sm text-[color:var(--danger-foreground)]">{versionErrors.root.message}</p> : null}
          <label className="space-y-1">
            <span className={ui.label}>파싱 템플릿 이름</span>
            <Input aria-label="파싱 템플릿 이름" {...registerVersionField('name')} />
            {versionErrors.name?.message ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{versionErrors.name.message}</p> : null}
          </label>
          <div className="space-y-1"><span className={ui.label}>샘플 파일</span><FileDropInput ariaLabel="샘플 파일" accept=".xlsx,.xls,.csv" onFile={inspectVersionSample} /></div>
          {versionSample ? (
            <div className="space-y-1">
              <ParseTemplateBuilder<'externalSku' | 'quantity'>
                roles={inboundRoles}
                sample={versionSample}
                sheetName={sheetNameField.field.value}
                headerRowNumber={headerRowField.field.value as number}
                mapping={mappingField.field.value}
                onSheetChange={sheetNameField.field.onChange}
                onHeaderRowChange={headerRowField.field.onChange}
                onMappingChange={mappingField.field.onChange}
                customMappings={customMappingsField.field.value}
                onCustomMappingsChange={customMappingsField.field.onChange}
              />
              {versionErrors.sheetName?.message ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{versionErrors.sheetName.message}</p> : null}
              {versionErrors.headerRowNumber?.message ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{versionErrors.headerRowNumber.message}</p> : null}
              {versionErrors.mapping?.externalSku?.message ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{versionErrors.mapping.externalSku.message}</p> : null}
              {versionErrors.mapping?.quantity?.message ? <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">{versionErrors.mapping.quantity.message}</p> : null}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={isRegisterOpen}
        title="입고처 등록"
        description="새 입고처의 연락처와 메모를 등록합니다."
        onOpenChange={(open) => {
          setIsRegisterOpen(open)
          if (!open) setRegisterFormError(null)
        }}
      >
        <div className="space-y-3">
          {schemaState.status === 'missing' && schemaState.message ? (
            <Card variant="muted" className="overflow-hidden">
              <CardContent className="px-4 py-3 text-sm font-medium text-[color:var(--muted-foreground)]">{schemaState.message}</CardContent>
            </Card>
          ) : null}

          {isRegisterOpen ? (
            <AutoForm<FactoryFormValues>
              schema={factoryFormProvider}
              onSubmit={submitFactory}
              uiComponents={autoFormUiComponents}
              formComponents={autoFormFieldComponents}
            >
              {registerFormError ? (
                <p role="alert" className="text-sm text-[color:var(--danger-foreground)]">
                  {registerFormError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="secondary" onClick={() => setIsRegisterOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={schemaState.status === 'missing' || isPending}>
                  등록
                </Button>
              </div>
            </AutoForm>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
