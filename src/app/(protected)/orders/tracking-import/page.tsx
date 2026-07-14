import { PageHeader, ui } from '@/app/components/ui'
import TrackingImportWorkspace from './tracking-import-workspace'

export default function TrackingImportPage() {
  return <div className={ui.shell}><PageHeader title="송장 업로드" /><TrackingImportWorkspace /></div>
}
