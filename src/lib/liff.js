import liff from '@line/liff'

let initPromise = null

// liff.login() redirects the whole page away to LINE's login flow and
// never returns here directly (the redirect back lands as a fresh page
// load) — so this promise is only ever meant to resolve once we already
// have a logged-in context.
export function initLiff() {
  if (!initPromise) {
    initPromise = (async () => {
      const liffId = import.meta.env.VITE_LIFF_ID
      if (!liffId || liffId === 'REPLACE_WITH_REAL_LIFF_ID') {
        throw new Error('VITE_LIFF_ID is not configured')
      }
      await liff.init({ liffId })
      if (!liff.isLoggedIn()) {
        liff.login()
        return new Promise(() => {})
      }
      const lineID = liff.getContext()?.userId
      if (!lineID) throw new Error('LIFF context has no userId')
      return lineID
    })()
  }
  return initPromise
}
