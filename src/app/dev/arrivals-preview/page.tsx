import { notFound } from 'next/navigation'
import ArrivalsView from '@/app/(protected)/sourcing/arrivals/ArrivalsView'
import { arrivalsPreviewProps } from './fixture'

export default function ArrivalsPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ArrivalsView {...arrivalsPreviewProps} />
}
