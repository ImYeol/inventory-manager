'use server'

import {
  buildCoupangMaskedSummary,
  buildNaverMaskedSummary,
  deleteShippingCredentialsForCurrentUser,
  getShippingSettingsSummaryForCurrentUser,
  saveShippingCredentialsForCurrentUser,
  ShippingCredentialsConfigurationError,
  type CoupangCredentials,
  type NaverCredentials,
  type ShippingProvider,
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

type DeleteSettingsResult = {
  success: boolean
  error?: string
}

const encryptionConfigurationErrorMessage =
  '저장소 보안 설정이 필요합니다. 배포 환경의 서버 전용 암호화 키를 설정한 뒤 다시 시도해주세요.'

function getSaveSettingsError(error: unknown, fallback: string) {
  if (error instanceof ShippingCredentialsConfigurationError) {
    return encryptionConfigurationErrorMessage
  }

  return error instanceof Error ? error.message : fallback
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
    defaultDeliveryCompanyCode: readField(input, 'defaultDeliveryCompanyCode'),
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
      error: getSaveSettingsError(error, '네이버 API 설정을 저장하지 못했습니다.'),
    }
  }
}

export async function saveCoupangSettings(
  input: FormData | CoupangSettingsInput
): Promise<SaveSettingsResult> {
  const credentials = parseCoupangSettingsInput(input)

  if (
    !credentials.accessKey ||
    !credentials.secretKey ||
    !credentials.vendorId ||
    !credentials.defaultDeliveryCompanyCode
  ) {
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
      error: getSaveSettingsError(error, '쿠팡 API 설정을 저장하지 못했습니다.'),
    }
  }
}

export async function deleteShippingProviderCredentials(
  provider: ShippingProvider
): Promise<DeleteSettingsResult> {
  try {
    await deleteShippingCredentialsForCurrentUser(provider)
    return { success: true }
  } catch {
    return {
      success: false,
      error: '연결 정보를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}
