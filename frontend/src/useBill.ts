import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, type BillDetails } from './api'
import { loadSession, type StoredSession } from './lib'

export type Connection = 'live' | 'reconnecting' | 'offline'

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error' }
  | { kind: 'noaccess' }
  | { kind: 'ready'; session: StoredSession }

// Masanın tek kaynağı: önce GET ile Bill okunur, token varsa SignalR grubuna JoinBill ile girilir.
// Sonrasında her BillUpdated olayı ve her mutasyon yanıtı güncel snapshot'ı getirir.
export function useBill(code: string) {
  const [bill, setBillState] = useState<BillDetails | null>(null)
  const [updatedAt, setUpdatedAt] = useState(() => Date.now())
  const setBill = useCallback((next: BillDetails) => {
    setBillState(next)
    setUpdatedAt(Date.now())
  }, [])
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [connection, setConnection] = useState<Connection>(navigator.onLine ? 'live' : 'offline')
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => {
    setLoad({ kind: 'loading' })
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    let connectionRef: HubConnection | null = null
    let retryTimer: number | undefined

    const connect = async (stored: StoredSession) => {
      const hub = new HubConnectionBuilder()
        .withUrl('/hubs/bills')
        .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
        .build()
      connectionRef = hub

      const join = async () => {
        const snapshot = await hub.invoke<BillDetails>('JoinBill', code, stored.accessToken)
        if (!cancelled) setBill(snapshot)
      }

      hub.on('BillUpdated', (snapshot: BillDetails) => {
        if (!cancelled) setBill(snapshot)
      })
      hub.onreconnecting(() => {
        if (!cancelled) setConnection(navigator.onLine ? 'reconnecting' : 'offline')
      })
      hub.onreconnected(async () => {
        try {
          await join()
          if (!cancelled) setConnection('live')
        } catch {
          if (!cancelled) setLoad({ kind: 'noaccess' })
        }
      })
      hub.onclose(() => {
        if (cancelled) return
        setConnection(navigator.onLine ? 'reconnecting' : 'offline')
        retryTimer = window.setTimeout(() => void connect(stored), 5000)
      })

      try {
        await hub.start()
      } catch {
        if (cancelled) return
        setConnection(navigator.onLine ? 'reconnecting' : 'offline')
        retryTimer = window.setTimeout(() => void connect(stored), 5000)
        return
      }

      try {
        await join()
        if (!cancelled) setConnection('live')
      } catch {
        // Bağlantı kuruldu ama token masaya erişim sağlamadı.
        if (!cancelled) setLoad({ kind: 'noaccess' })
      }
    }

    const start = async () => {
      let details: BillDetails
      try {
        details = await api.getBill(code)
      } catch (error) {
        if (cancelled) return
        setLoad(error instanceof ApiError && error.kind === 'notfound' ? { kind: 'notfound' } : { kind: 'error' })
        return
      }
      if (cancelled) return
      setBill(details)

      const stored = loadSession(code)
      if (!stored) {
        setLoad({ kind: 'noaccess' })
        return
      }
      setLoad({ kind: 'ready', session: stored })
      await connect(stored)
    }

    const goOffline = () => setConnection('offline')
    const goOnline = () => setConnection((value) => (value === 'offline' ? 'reconnecting' : value))
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    void start()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      if (connectionRef && connectionRef.state !== HubConnectionState.Disconnected) void connectionRef.stop()
    }
  }, [code, attempt])

  return { bill, setBill, load, connection, reload, updatedAt }
}
