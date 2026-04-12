'use server'

import {
  buildCoupangMaskedSummary,
  buildNaverMaskedSummary,
  getShippingSettingsSummaryForCurrentUser,
  saveShippingCredentialsForCurrentUser,
  type CoupangCredentials,
  type NaverCredentials,
  type ShippingSettingsSummary,
  type ShippingSettingsSummaryItem,
} from '../shipping-credentials'

export type NaverSettingsInput = NaverCredentials

export type CoupangSettingsInput = CoupangCredentials

type SaveSettingsResult = {
  success: boolean
  summary?: ShippingSettingsSummaryItem
  error?: string
}

function readField(input: FormData | Record<string, unknown>, key: string) {
  const rawValue = input instanceof FormData ? input.get(key) : input[key]
  return typeof rawValue === 'string' ? rawValue.trim() : ''
}

function parseNaverSettingsInput(input: FormData | NaverSettingsInput): NaverSettingsInput {
  return {
    clientId: readField(input, 'clientId'),
    clientSecret: readField(input, 'clientSecret'),
  }
}

function parseCoupangSettingsInput(input: FormData | CoupangSettingsInput): CoupangSettingsInput {
  return {
    accessKey: readField(input, 'accessKey'),
    secretKey: readField(input, 'secretKey'),
    vendorId: readField(input, 'vendorId'),
  }
}

export async function getShippingSettingsSummary(): Promise<ShippingSettingsSummary> {
  return getShippingSettingsSummaryForCurrentUser()
}

export async function saveNaverSettings(
  input: FormData | NaverSettingsInput
): Promise<SaveSettingsResult> {
  const credentials = parseNaverSettingsInput(input)

  if (!credentials.clientId || !credentials.clientSecret) {
    return {
      success: false,
      error: '네이버 API 키 정보를 모두 입력해주세요.',
    }
  }

  try {
    const summary = await saveShippingCredentialsForCurrentUser(
      'naver',
      credentials,
      buildNaverMaskedSummary(credentials)
    )

    return { success: true, summary }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '네이버 API 설정을 저장하지 못했습니다.',
    }
  }
}

export async function saveCoupangSettings(
  input: FormData | CoupangSettingsInput
): Promise<SaveSettingsResult> {
  const credentials = parseCoupangSettingsInput(input)

  if (!credentials.accessKey || !credentials.secretKey || !credentials.vendorId) {
    return {
      success: false,
      error: '쿠팡 API 키 정보를 모두 입력해주세요.',
    }
  }

  try {
    const summary = await saveShippingCredentialsForCurrentUser(
      'coupang',
      credentials,
      buildCoupangMaskedSummary(credentials)
    )

    return { success: true, summary }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '쿠팡 API 설정을 저장하지 못했습니다.',
    }
  }
}
