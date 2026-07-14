import { PageHeader, ui } from '@/app/components/ui'
import { listTrackingPresets } from '@/lib/actions/tracking-import'
import TrackingImportWorkspace from './tracking-import-workspace'

export default async function TrackingImportPage() {
  const presets = await listTrackingPresets()
  return <div className={ui.shell}><PageHeader title="송장 업로드" /><TrackingImportWorkspace initialPresets={presets} /></div>
}
