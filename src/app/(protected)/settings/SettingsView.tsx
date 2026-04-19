import type { ShippingSettingsSummary } from '@/lib/shipping-credentials'
import IntegrationsView from '../integrations/IntegrationsView'

export default function SettingsView({ summary }: { summary: ShippingSettingsSummary }) {
  return <IntegrationsView summary={summary} embedded />
}
