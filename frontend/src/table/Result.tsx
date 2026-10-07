import { useEffect, useState } from 'react'
import { SplitType, api, type BillCalculation } from '../api'
import { formatMoney } from '../lib'
import { Avatar, Icon } from '../ui'
import type { TableCtx } from './types'

export default function Result({ ctx }: { ctx: TableCtx }) {
  const { bill, me, isHost } = ctx
  const [calculation, setCalculation] = useState<BillCalculation | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<'all' | 'mine'>('all')

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    api
      .calculate(bill.code)
      .then((value) => {
        if (!cancelled) setCalculation(value)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [bill.code, attempt])

  const mine = calculation?.participants.find((p) => p.participantId === me.id)

  const header = (
    <div>
      <div className="mono" style={{ fontSize: 12, letterSpacing: '0.14em', color: '#cfc8ba' }}>
        {bill.code} · {bill.participants.length} KİŞİ
      </div>
      <h1 style={{ margin: '6px 0 0', fontSize: 52, lineHeight: 0.9, fontWeight: 800, letterSpacing: '-0.04em' }}>
        Hesap
        <br />
        <span style={{ color: 'var(--lime)' }}>kesildi.</span>
      </h1>
    </div>
  )

  if (failed || !calculation) {
    return (
      <main className="result">
        <div className="inner">
          {header}
          <div style={{ marginTop: 28, background: '#26221c', borderRadius: 18, padding: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
            {failed ? (
              <>
                <div style={{ flex: 1, fontSize: 15, lineHeight: 1.4 }}>Sonucu şu an getiremedik. Tekrar denemen yeterli.</div>
                <button type="button" className="btn sm ok" onClick={() => setAttempt((v) => v + 1)}>
                  <Icon name="retry" size={16} />
                  Tekrar dene
                </button>
              </>
            ) : (
              <>
                <Icon name="spinner" spin />
                <div style={{ fontSize: 15 }}>Sonuç hazırlanıyor…</div>
              </>
            )}
          </div>
          {isHost && <ReopenButton ctx={ctx} />}
        </div>
      </main>
    )
  }

  if (view === 'mine') {
    const lines = bill.items
      .map((item) => {
        const sels = bill.selections.filter((s) => s.billItemId === item.id)
        const own = sels.find((s) => s.participantId === me.id)
        if (!own) return null
        const shared = item.splitType === SplitType.Shared
        return { id: item.id, name: item.name, shared, text: shared ? `${sels.length} kişiyle paylaştın` : `${own.quantity} adet` }
      })
      .filter((line) => line !== null)

    return (
      <main className="mine-screen" style={{ background: 'var(--paper)' }}>
        <div className="narrow">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" className="ib" onClick={() => setView('all')} aria-label="Geri">
              <Icon name="left" />
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999, padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>
              <Icon name="lock" size={14} />
              Hesap kesildi
            </span>
          </div>

          <div style={{ marginTop: 22, fontSize: 16, fontWeight: 700 }}>{me.username}, ödeyeceğin tutar</div>
          <div className="mono" style={{ fontSize: 60, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
            {mine ? formatMoney(mine.total) : '—'}
          </div>

          {mine && (
            <div className="sum-box">
              <div className="r">
                <span style={{ fontWeight: 700 }}>Ürünler</span>
                <span className="mono" style={{ fontWeight: 500, fontSize: 17 }}>{formatMoney(mine.itemTotal)}</span>
              </div>
              <div className="r">
                <span style={{ fontWeight: 700 }}>Servis payı</span>
                <span className="mono" style={{ fontWeight: 500, fontSize: 17 }}>{formatMoney(mine.serviceChargeShare)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Seçtiğin ürünler</div>
            <div className="mono" style={{ fontSize: 14 }}>{lines.length} kalem</div>
          </div>
          <div style={{ marginTop: 6, borderTop: '2px solid var(--ink)' }}>
            {lines.length === 0 && <div style={{ padding: '14px 0', color: 'var(--muted)' }}>Bu hesapta ürün seçmedin; yalnızca servis payın var.</div>}
            {lines.map((line) => (
              <div className="ln-item" key={line.id}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{line.name}</span>
                <span className={`tag ${line.shared ? 'shared' : 'qty'}`}>{line.text}</span>
              </div>
            ))}
          </div>

          <div className="spacer" style={{ minHeight: 20 }} />
          <button className="btn alt" type="button" onClick={() => setView('all')}>
            Masanın tamamını gör
          </button>
        </div>
      </main>
    )
  }

  const max = Math.max(...calculation.participants.map((p) => p.total), 1)
  const sorted = [...calculation.participants].sort((a, b) => b.total - a.total)

  return (
    <main className="result" style={{ position: 'relative', overflow: 'hidden' }}>
      {[
        ['6%', 'var(--tomato)', '0s'],
        ['22%', 'var(--lime)', '1.2s'],
        ['42%', 'var(--lavender)', '0.5s'],
        ['62%', 'var(--sun)', '2s'],
        ['80%', 'var(--sky)', '0.9s'],
        ['93%', 'var(--pink)', '2.8s'],
      ].map(([left, color, delay]) => (
        <div key={left} className="confetti" aria-hidden="true" style={{ left, background: color, animationDelay: delay }} />
      ))}
      <div className="inner" style={{ position: 'relative' }}>
        {header}

        <div className="slip">
          <div className="zz">
            <div className="head">
              <span>Kim ne kadar?</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>servis dahil</span>
            </div>
            {sorted.map((p) => {
              const person = bill.participants.find((x) => x.id === p.participantId)
              return (
                <div className="pr" key={p.participantId}>
                  <Avatar bill={bill} participantId={p.participantId} name={p.username} large me={p.participantId === me.id} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>
                        {p.username}
                        {p.participantId === me.id ? ' (sen)' : ''}
                        {person?.isHost ? ' · host' : ''}
                      </span>
                      <span className="mono" style={{ fontWeight: 500 }}>{formatMoney(p.total)}</span>
                    </div>
                    <div className="bar" style={{ width: `${Math.max((p.total / max) * 100, 6)}%`, background: 'var(--sky)' }} />
                  </div>
                </div>
              )
            })}
            <div className="foot">
              <span>TOPLAM</span>
              <span className="mono" style={{ fontWeight: 500, fontSize: 20 }}>{formatMoney(calculation.total)}</span>
            </div>
          </div>
        </div>

        <div className="spacer" style={{ minHeight: 16 }} />
        <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.4, color: '#cfc8ba' }}>
          Tutarlar kilitlendi. Bir şey yanlışsa host hesabı yeniden açabilir; seçimler korunur, herkes yeniden “seçimim bitti” der.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {isHost && <ReopenButton ctx={ctx} inline />}
          <button className="btn" type="button" style={{ flex: 1 }} onClick={() => setView('mine')}>
            Benim dökümüm
          </button>
        </div>
      </div>
    </main>
  )
}

function ReopenButton({ ctx, inline = false }: { ctx: TableCtx; inline?: boolean }) {
  return (
    <button
      className="btn ghost"
      type="button"
      style={{ flex: 1, marginTop: inline ? 0 : 20, fontSize: 16 }}
      disabled={ctx.busy}
      onClick={() => void ctx.act((token) => api.reopen(ctx.bill.id, token))}
    >
      <Icon name="retry" size={18} />
      Yeniden aç
    </button>
  )
}
