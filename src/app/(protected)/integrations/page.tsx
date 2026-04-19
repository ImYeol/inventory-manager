import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function IntegrationsPage() {
  redirect('/settings?section=store-connections')
}
