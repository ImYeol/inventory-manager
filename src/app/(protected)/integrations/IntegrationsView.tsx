import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import SettingsView from '../settings/SettingsView'

export default function IntegrationsView({
  summary,
}: {
  summary: ShippingSettingsSummary
}) {
  return <SettingsView summary={summary} />
}
