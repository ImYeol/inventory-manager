import crypto from 'crypto'

import { getSupabaseWithUser } from './db'

export type ShippingProvider = 'naver' | 'coupang'

export type NaverCredentials = {
  clientId: string
  clientSecret: string
}

export type CoupangCredentials = {
  accessKey: string
  secretKey: string
  vendorId: string
}

export type ShippingSettingsSummaryItem = {
  configured: boolean
  masked: Record<string, string>
  updatedAt: string | null
}

export type ShippingSettingsSummary = {
  naver: ShippingSettingsSummaryItem
  coupang: ShippingSettingsSummaryItem
}

type StoredCredentialRow = {
  provider: ShippingProvider
  encrypted_payload: string
  iv: string
  auth_tag: string
  key_version: number
  masked_summary: Record<string, string> | null
  updated_at: string
}

type StoredCredentialEnvelope = Pick<
  StoredCredentialRow,
  'encrypted_payload' | 'iv' | 'auth_tag' | 'key_version'
>

const SHIPPING_CREDENTIALS_KEY_VERSION = 1

export class MissingShippingCredentialsError extends Error {
  constructor(provider: ShippingProvider) {
    super(getMissingCredentialsMessage(provider))
    this.name = 'MissingShippingCredentialsError'
  }
}

function getMissingCredentialsMessage(provider: ShippingProvider) {
  return provider === 'naver'
    ? '네이버 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.'
    : '쿠팡 API 설정이 필요합니다. 설정에서 API 키를 먼저 저장해주세요.'
}

function hasConfiguredMaskedValue(
  maskedSummary: Record<string, string> | null | undefined,
  provider: ShippingProvider,
) {
  const summary = maskedSummary ?? {}

  if (provider === 'naver') {
    return typeof summary.clientId === 'string' && summary.clientId.length > 0
  }

  return (
    typeof summary.accessKey === 'string' &&
    summary.accessKey.length > 0 &&
    typeof summary.vendorId === 'string' &&
    summary.vendorId.length > 0
  )
}

function getEncryptionKey(): Buffer {
  const secret = process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY?.trim()

  if (!secret) {
    throw new Error('SHIPPING_CREDENTIALS_ENCRYPTION_KEY 환경변수가 필요합니다.')
  }

  return crypto.createHash('sha256').update(secret).digest()
}

function encryptPayload(payload: unknown): StoredCredentialEnvelope {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return {
    encrypted_payload: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    auth_tag: authTag.toString('base64'),
    key_version: SHIPPING_CREDENTIALS_KEY_VERSION,
  }
}

function decryptPayload<T>(payload: StoredCredentialEnvelope): T {
  if (payload.key_version !== SHIPPING_CREDENTIALS_KEY_VERSION) {
    throw new Error('지원하지 않는 운송장 API 키 버전입니다.')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.auth_tag, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted_payload, 'base64')),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8')) as T
}

function maskValue(value: string, visibleStart = 2, visibleEnd = 2) {
  if (!value) {
    return ''
  }

  if (value.length <= visibleStart + visibleEnd) {
    return '*'.repeat(value.length)
  }

  return `${value.slice(0, visibleStart)}${'*'.repeat(
    value.length - visibleStart - visibleEnd
  )}${value.slice(-visibleEnd)}`
}

function toSummaryItem(
  provider: ShippingProvider,
  row?: Pick<StoredCredentialRow, 'masked_summary' | 'updated_at'>,
): ShippingSettingsSummaryItem {
  const configured = hasConfiguredMaskedValue(row?.masked_summary, provider)

  return {
    configured,
    masked: configured ? row?.masked_summary ?? {} : {},
    updatedAt: configured ? row?.updated_at ?? null : null,
  }
}

export function buildNaverMaskedSummary(credentials: NaverCredentials) {
  return {
    clientId: maskValue(credentials.clientId),
  }
}

export function buildCoupangMaskedSummary(credentials: CoupangCredentials) {
  return {
    accessKey: maskValue(credentials.accessKey),
    vendorId: maskValue(credentials.vendorId),
  }
}

export async function getShippingSettingsSummaryForCurrentUser(): Promise<ShippingSettingsSummary> {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('shipping_provider_credentials')
    .select('provider, masked_summary, updated_at')

  if (error) {
    throw new Error('운송장 API 설정 정보를 불러오지 못했습니다.')
  }

  const rows = (data ?? []) as Array<
    Pick<StoredCredentialRow, 'provider' | 'masked_summary' | 'updated_at'>
  >

  return {
    naver: toSummaryItem('naver', rows.find((row) => row.provider === 'naver')),
    coupang: toSummaryItem('coupang', rows.find((row) => row.provider === 'coupang')),
  }
}

export async function saveShippingCredentialsForCurrentUser(
  provider: ShippingProvider,
  credentials: NaverCredentials | CoupangCredentials,
  maskedSummary: Record<string, string>
): Promise<ShippingSettingsSummaryItem> {
  const { supabase, user } = await getSupabaseWithUser()
  const encrypted = encryptPayload(credentials)

  const { error } = await supabase.from('shipping_provider_credentials').upsert(
    {
      user_id: user.id,
      provider,
      masked_summary: maskedSummary,
      updated_at: new Date().toISOString(),
      ...encrypted,
    },
    { onConflict: 'user_id,provider' }
  )

  if (error) {
    throw new Error('운송장 API 설정을 저장하지 못했습니다.')
  }

  const summary = await getShippingSettingsSummaryForCurrentUser()
  return summary[provider]
}

export async function getRequiredShippingCredentials(
  provider: 'naver'
): Promise<NaverCredentials>
export async function getRequiredShippingCredentials(
  provider: 'coupang'
): Promise<CoupangCredentials>
export async function getRequiredShippingCredentials(provider: ShippingProvider) {
  const { supabase } = await getSupabaseWithUser()
  const { data, error } = await supabase
    .from('shipping_provider_credentials')
    .select('provider, encrypted_payload, iv, auth_tag, key_version')

  if (error) {
    throw new Error('운송장 API 설정 정보를 확인하지 못했습니다.')
  }

  const rows = (data ?? []) as Array<StoredCredentialEnvelope & { provider: ShippingProvider }>
  const row = rows.find((item) => item.provider === provider)

  if (!row) {
    throw new MissingShippingCredentialsError(provider)
  }

  return decryptPayload(row) as NaverCredentials | CoupangCredentials
}
