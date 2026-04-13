import { redirect } from 'next/navigation'
import { getSetupState } from './data'

export async function enforceSetupComplete() {
  const setupState = await getSetupState()

  if (setupState.needsSetup) {
    redirect('/master-data')
  }
}
