import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { BillDetails } from './api'
import { avatarColor, initial } from './lib'

// ---------- ikonlar (çizgi, 24px) ----------

const PATHS = {
  right: 'M5 12h14M13 6l6 6-6 6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  retry: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9a4 4 0 100 8 4 4 0 000-8z',
  share: 'M12 3v13M7 8l5-5 5 5M5 14v6h14v-6',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  check: 'M5 13l4 4L19 7',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  wifioff: 'M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5v.1M3 3l18 18',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  spinner: 'M12 3a9 9 0 109 9',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  circles: 'M9 6a6 6 0 100 12 6 6 0 000-12zM15 6a6 6 0 100 12 6 6 0 000-12z',
  server: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
  image: 'M3 4h18v16H3zM9 8a2 2 0 100 4 2 2 0 000-4zM21 17l-5-5-9 8M3 3l18 18',
  key: 'M8 11a4 4 0 100 8 4 4 0 000-8zM10.8 16.2L20 7M16 11l3 3',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5M12 16v.5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, spin = false }: { name: IconName; size?: number; spin?: boolean }) {
  return (
    <svg
      className={spin ? 'spin' : undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="receipt" size={18} />
      </span>
      ben sana atarım
    </div>
  )
}

export function BackLink({ to, label = 'Geri' }: { to: string; label?: string }) {
  return (
    <Link className="ib" to={to} aria-label={label}>
      <Icon name="left" />
    </Link>
  )
}

// ---------- avatar ----------

export function Avatar({
  bill,
  participantId,
  name,
  large = false,
  me = false,
  ready = false,
  extraClass = '',
}: {
  bill: BillDetails
  participantId: string
  name: string
  large?: boolean
  me?: boolean
  ready?: boolean
  extraClass?: string
}) {
  return (
    <span
      className={`av${large ? ' lg' : ''}${me ? ' me' : ''}${extraClass ? ' ' + extraClass : ''}`}
      style={{ background: avatarColor(bill, participantId) }}
      title={name}
    >
      {initial(name)}
      {ready && (
        <span className="tick">
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#16130F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d={PATHS.check} />
          </svg>
        </span>
      )}
    </span>
  )
}

// ---------- sheet ----------

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        {children}
      </section>
    </div>
  )
}

// ---------- banner ----------

export function ConnectionBanner({
  state,
  onRetry,
  updatedAt,
}: {
  state: 'live' | 'reconnecting' | 'offline'
  onRetry: () => void
  updatedAt: number
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state === 'live') return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [state])

  if (state === 'live') return null
  const seconds = Math.max(Math.round((now - updatedAt) / 1000), 0)
  const age = seconds < 60 ? `${seconds} sn` : `${Math.floor(seconds / 60)} dk`
  if (state === 'offline') {
    return (
      <div className="banner offline" role="alert">
        <span style={{ color: 'var(--sun)' }}>
          <Icon name="wifioff" size={26} />
        </span>
        <div style={{ flex: 1 }}>
          <b>İnternet masadan kalktı.</b>
          <span className="sub">Seçimlerin şu an gitmiyor. Bağlantı gelince kaldığın yerden devam. Son güncelleme {age} önce.</span>
        </div>
        <button type="button" className="btn sm ok" onClick={onRetry}>
          <Icon name="retry" size={16} />
          Tekrar dene
        </button>
      </div>
    )
  }
  return (
    <div className="banner realtime" role="status">
      <Icon name="spinner" size={22} spin />
      <div>
        <b>Canlı bağlantı koptu, geri bağlanıyoruz…</b>
        <span className="sub">Masadakilerin hareketini şimdilik göremiyor olabilirsin. Son güncelleme {age} önce.</span>
      </div>
    </div>
  )
}

// ---------- tam sayfa hata ----------

export function ErrorScreen({
  icon,
  tone,
  title,
  text,
  tips,
  children,
}: {
  icon: IconName
  tone: string
  title: ReactNode
  text: ReactNode
  tips?: ReactNode
  children?: ReactNode
}) {
  return (
    <main className="narrow">
      <Brand />
      <div className="badge-ill" style={{ background: tone }}>
        <Icon name={icon} size={56} />
      </div>
      <h1 className="h1-sm center-text" style={{ marginTop: 28 }}>
        {title}
      </h1>
      <p className="lead center-text" style={{ marginTop: 14 }}>
        {text}
      </p>
      {tips && <div className="tips">{tips}</div>}
      <div className="spacer" style={{ minHeight: 24 }} />
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </main>
  )
}

export function LoadingScreen() {
  return (
    <main className="table-shell" aria-busy="true" aria-label="Masa hazırlanıyor">
      <div className="topbar">
        <div className="who" style={{ display: 'grid', gap: 8 }}>
          <div className="sk" style={{ width: 170, height: 22 }} />
          <div className="sk" style={{ width: 210, height: 12 }} />
        </div>
      </div>
      <div className="items">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="item" style={{ display: 'grid', gap: 10 }}>
            <div className="sk" style={{ width: 150, height: 18 }} />
            <div className="sk" style={{ width: 190, height: 12 }} />
          </div>
        ))}
      </div>
      <div className="toasts">
        <div className="toast toast-info">
          <Icon name="spinner" size={18} spin />
          Masa hazırlanıyor…
        </div>
      </div>
    </main>
  )
}
