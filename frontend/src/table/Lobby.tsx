import { toCanvas } from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { inviteUrl } from '../lib'
import { useToast } from '../toast'
import { Avatar, Brand, Icon } from '../ui'
import type { TableCtx } from './types'

function ParticipantList({ ctx, fresh }: { ctx: TableCtx; fresh: string[] }) {
  const { bill, me } = ctx
  return (
    <div style={{ borderTop: '2px solid var(--ink)', marginTop: 6 }}>
      {bill.participants.map((p) => (
        <div className="prow" key={p.id}>
          <Avatar bill={bill} participantId={p.id} name={p.username} large me={p.id === me.id} />
          <div className="name">
            {p.username}
            {p.id === me.id && <span style={{ fontWeight: 500, color: 'var(--muted)' }}> (sen)</span>}
          </div>
          {fresh.includes(p.id) && <span className="fresh">az önce geldi</span>}
          {p.isHost && (
            <span className="pill">
              <Icon name="crown" size={14} />
              Host
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Lobby({ ctx, onScan }: { ctx: TableCtx; onScan: () => void }) {
  const { bill } = ctx
  const toast = useToast()
  const canvas = useRef<HTMLCanvasElement>(null)
  const url = inviteUrl(bill.code)

  // Lobi açıkken sonradan gelen katılımcıları kısa süre vurgula.
  const known = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<string[]>([])
  useEffect(() => {
    const ids = bill.participants.map((p) => p.id)
    if (known.current === null) {
      known.current = new Set(ids)
      return
    }
    const seen = known.current
    const added = ids.filter((id) => !seen.has(id))
    if (added.length === 0) return
    added.forEach((id) => seen.add(id))
    setFresh((current) => [...current, ...added])
    window.setTimeout(() => setFresh((current) => current.filter((id) => !added.includes(id))), 8000)
  }, [bill.participants])

  useEffect(() => {
    if (canvas.current) {
      void toCanvas(canvas.current, url, { width: 116, margin: 0, color: { dark: '#16130F', light: '#FFFFFF' } })
    }
  }, [url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.show('Link kopyalandı.', 'success')
    } catch {
      toast.show('Kopyalanamadı. Linki elle seçip kopyalayabilirsin.', 'warn')
    }
  }

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'ben sana atarım', text: 'Hesabı birlikte bölüşelim:', url })
        return
      } catch {
        // kullanıcı vazgeçti ya da paylaşım açılamadı: kopyalamaya düş
      }
    }
    await copy()
  }

  return (
    <main className="narrow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand />
        <span className="pill">
          <Icon name="crown" size={14} />
          Host
        </span>
      </div>

      <h1 className="h1-sm" style={{ marginTop: 22 }}>Masa kuruldu.</h1>

      <div className="codecard">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="qr" role="img" aria-label="Masaya katılmak için QR kod">
            <canvas ref={canvas} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="cap">MASA KODU</div>
            <div className="code">{bill.code}</div>
            <div style={{ fontSize: 13, color: '#cfc8ba', marginTop: 6, lineHeight: 1.3 }}>Masadakiler kameradan okutsun</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" className="sbtn" onClick={() => void copy()}>
            <Icon name="copy" size={18} />
            Kopyala
          </button>
          <button type="button" className="sbtn" style={{ background: 'var(--lime)' }} onClick={() => void share()}>
            <Icon name="share" size={18} />
            Linki paylaş
          </button>
        </div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>
          Masadakiler <span className="mono" style={{ fontWeight: 500 }}>{bill.participants.length}</span>
        </div>
        <div className="dots" style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>
          yeni gelen burada belirir<span>.</span><span>.</span><span>.</span>
        </div>
      </div>
      <ParticipantList ctx={ctx} fresh={fresh} />

      <div className="spacer" style={{ minHeight: 20 }} />
      <p className="lead center-text" style={{ fontSize: 14, marginBottom: 12 }}>
        Fişin fotoğrafını çek; biz okuyalım, sen kontrol et.
      </p>
      <button className="btn" type="button" onClick={onScan}>
        <Icon name="camera" size={22} />
        Fişi okut
      </button>
    </main>
  )
}

export function GuestWaiting({ ctx }: { ctx: TableCtx }) {
  const { bill, me } = ctx
  const host = bill.participants.find((p) => p.isHost)
  return (
    <main className="narrow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand />
        <span className="mono" style={{ fontSize: 13, letterSpacing: '0.08em', border: '2px solid var(--ink)', borderRadius: 999, padding: '4px 10px', background: 'var(--white)' }}>
          {bill.code}
        </span>
      </div>

      <div className="stage" aria-hidden="true">
        <div className="ring" />
        <div className="printer">
          <div className="slot" />
          <div className="paper">
            {[100, 70, 85, 60, 78].map((w) => (
              <i key={w} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="orbit">
          {bill.participants.slice(0, 6).map((p, index, list) => (
            <div key={p.id} className="slot-av" style={{ '--a': `${(360 / list.length) * index}deg` } as React.CSSProperties}>
              <Avatar bill={bill} participantId={p.id} name={p.username} large me={p.id === me.id} />
            </div>
          ))}
        </div>
      </div>

      <h1 className="h1-sm center-text" style={{ marginTop: 30 }}>
        Oturdun, {me.username}.
        <br />
        Fiş yolda.
      </h1>
      <p className="lead center-text" style={{ marginTop: 12 }}>
        {host ? host.username : 'Host'} fişi okutup onaylayınca kalemler burada belirecek. Sayfayı yenilemene gerek yok.
      </p>

      <div className="spacer" style={{ minHeight: 24 }} />
      <div className="note" style={{ alignItems: 'center', borderStyle: 'solid' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#7da80f', border: '2px solid var(--ink)', flex: 'none' }} />
        <div>
          <b style={{ color: 'var(--ink)' }}>Canlı bağlısın.</b> Masada {bill.participants.length} kişi var; yeni gelen olursa göreceksin.
        </div>
      </div>
    </main>
  )
}
