import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, ui } from '@/app/components/ui'
import { Button } from '@/components/ui/button'
import { listTrackingPresets } from '@/lib/actions/tracking-import'
import TrackingImportWorkspace from './tracking-import-workspace'

export default async function TrackingImportPage() {
  const presets = await listTrackingPresets()
  return (
    <div className={ui.shell}>
      <PageHeader
        title="송장 업로드"
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/orders"><ArrowLeft aria-hidden="true" />주문으로</Link>
          </Button>
        }
      />
      <TrackingImportWorkspace initialPresets={presets} />
    </div>
  )
}
