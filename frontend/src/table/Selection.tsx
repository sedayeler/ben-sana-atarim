import { useEffect, useState } from 'react'
import { SplitType, api, type BillCalculation, type SplitTypeValue } from '../api'
import { formatMoney, inviteUrl, possessive } from '../lib'
import { useToast } from '../toast'
import { Avatar, Icon, Sheet } from '../ui'
import { describeItems, useCalculation, type ItemView } from './derive'
import FinalizeScreen from './FinalizeScreen'
import type { TableCtx } from './types'

// Bu adedin üstündeki kalemlerde adet başına nokta yerine kişi başına tek şerit çizilir.
const MAX_PIPS = 24

type Filter ='all' | 'open' | 'mine'

export default function Selection({ ctx, onEditReceipt }: { ctx: TableCtx; onEditReceipt: () => void }) {
  const { bill, me, isHost } = ctx
  const views = describeItems(bill)
  const distributed = views.length > 0 && views.every((v) => v.complete)
  const calculation = useCalculation(bill, distributed)

  const [filter, setFilter] = useState<Filter>('all')
  const [statusOpen, setStatusOpen] = useState(false)
  const [splitFor, setSplitFor] = useState<ItemView | null>(null)
  const [conflictId, setConflictId] = useState<string | null>(null)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const offline = ctx.connection === 'offline'

  const mineOf = (view: ItemView) => view.selections.find((s) => s.participantId === me.id)?.quantity ?? 0
  const doneCount = views.filter((v) => v.complete).length
  const openCount = views.length - doneCount
  const mineCount = views.filter((v) => mineOf(v) > 0).length
  const visible = views.filter((v) => filter === 'all' || (filter === 'open' && !v.complete) || (filter === 'mine' && mineOf(v) > 0))
  const host = bill.participants.find((p) => p.isHost)

  const toggleShared = (view: ItemView) =>
    ctx.act((token) => (mineOf(view) > 0 ? api.removeSelection(bill.id, view.item.id, token) : api.selectItem(bill.id, view.item.id, 1, token)))

  const changeQty = async (view: ItemView, delta: 1 | -1) => {
    const current = mineOf(view)
    const next = current + delta
    const ok = await ctx.act(
      (token) => {
        if (next <= 0) return api.removeSelection(bill.id, view.item.id, token)
        if (current === 0) return api.selectItem(bill.id, view.item.id, next, token)
        return api.changeQuantity(bill.id, view.item.id, next, token)
      },
      { quietConflict: true },
    )
    // Artırma reddedildiyse ve kalemde sahipsiz adet kalmadıysa çakışmayı anlatan sheet açılır.
    if (!ok && delta === 1) {
      setConflictId(view.item.id)
    }
  }
  const conflictView = conflictId ? views.find((v) => v.item.id === conflictId) : undefined

  // Birisi adet bırakırsa (sahipsiz adet açılırsa) çakışma sheet'i kendiliğinden kapanır.
  const conflictOpen = conflictView?.open
  useEffect(() => {
    if (conflictId && conflictOpen !== undefined && conflictOpen > 0) setConflictId(null)
  }, [conflictId, conflictOpen])

  const toast = useToast()
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(bill.code))
      toast.show('Link kopyalandı.', 'success')
    } catch {
      toast.show('Kopyalanamadı. Linki elle seçip kopyalayabilirsin.', 'warn')
    }
  }

  const goToItem = (itemId: string) => {
    setFinalizeOpen(false)
    setFilter('all')
    window.setTimeout(() => {
      const el = document.getElementById(`item-${itemId}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('flash')
      window.setTimeout(() => el.classList.remove('flash'), 1700)
    }, 60)
  }

  const status = <StatusPanel ctx={ctx} views={views} distributed={distributed} calculation={calculation} />

  return (
    <main className="table-shell">
      <header className="topbar">
        <div className="who">
          <h1 className="title">Ne yedin, {me.username}?</h1>
          <div className="sub">
            {host ? possessive(host.username) : 'Host’un'} masası · <span className="mono">{bill.code}</span>
          </div>
        </div>
        <button type="button" className="av-stack" style={{ background: 'none', border: 'none', padding: 0 }} onClick={() => setStatusOpen(true)} aria-label="Masa durumunu aç">
          {bill.participants.slice(0, 5).map((p, index) => (
            <Avatar key={p.id} bill={bill} participantId={p.id} name={p.username} me={p.id === me.id} ready={p.isReady} extraClass={index >= 3 ? 'hide-mob' : ''} />
          ))}
          {bill.participants.length > 3 && (
            <span className="av more mob-only">+{bill.participants.length - 3}</span>
          )}
          {bill.participants.length > 5 && (
            <span className="av more desk-inline">+{bill.participants.length - 5}</span>
          )}
        </button>
        <span className="code-chip desk-inline">{bill.code}</span>
        <button type="button" className="chip desk-inline" style={{ background: 'var(--lime)' }} onClick={() => void copyInvite()}>
          <Icon name="share" size={16} />
          Davet linki
        </button>
        {isHost && (
          <>
            <button type="button" className="chip desk-inline" onClick={onEditReceipt}>
              <Icon name="pencil" size={16} />
              Fişi düzelt
            </button>
            <button type="button" className="chip desk-inline" style={{ background: 'var(--sun)' }} onClick={() => setFinalizeOpen(true)}>
              <Icon name="lock" size={16} />
              Hesabı kes
            </button>
            <button type="button" className="ib mob-only" onClick={onEditReceipt} aria-label="Fişi düzelt">
              <Icon name="pencil" />
            </button>
            <button type="button" className="ib mob-only" style={{ background: 'var(--sun)' }} onClick={() => setFinalizeOpen(true)} aria-label="Hesabı kes">
              <Icon name="lock" />
            </button>
          </>
        )}
      </header>

      <div className="progress">
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={views.length} aria-valuenow={doneCount}>
          <div style={{ width: `${views.length ? Math.round((doneCount / views.length) * 100) : 0}%` }} />
        </div>
        <div className="mono" style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {doneCount}/{views.length} dağıldı
        </div>
      </div>

      <div className="table-body">
        <div className="main-col">
          <div className="filters">
            {(
              [
                ['all', 'Hepsi', views.length],
                ['open', 'Sahipsiz', openCount],
                ['mine', 'Benimkiler', mineCount],
              ] as const
            ).map(([id, label, count]) => (
              <button key={id} type="button" className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
                {label} <span className="mono" style={{ fontWeight: 500 }}>{count}</span>
              </button>
            ))}
          </div>

          <div className={`items${offline ? ' offline-lock' : ''}${ctx.busy ? ' is-busy' : ''}`} aria-busy={ctx.busy}>
            {visible.length === 0 && (
              <div className="center-text" style={{ padding: '48px 20px' }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>Burası tertemiz.</div>
                <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 6 }}>
                  {filter === 'mine' ? 'Henüz bir şey seçmedin. “Hepsi” sekmesinden başla.' : 'Sahipsiz kalem kalmadı, her şeyin bir sahibi var.'}
                </div>
              </div>
            )}
            {visible.map((view) => (
              <ItemCard
                key={view.item.id}
                ctx={ctx}
                view={view}
                mine={mineOf(view)}
                onToggle={() => void toggleShared(view)}
                onChange={(delta) => void changeQty(view, delta)}
                onSplit={() => setSplitFor(view)}
              />
            ))}
          </div>
        </div>

        <aside className="aside">{status}</aside>
      </div>

      <footer className="footbar">
        {calculation && me ? <MyShareMini calculation={calculation} meId={me.id} /> : <LockedMini open={openCount} />}
        <div className="footrow">
          <ReadyButton ctx={ctx} />
          <button type="button" className="btn alt sq" onClick={() => setStatusOpen(true)} aria-label="Masa durumu">
            <Icon name="users" />
          </button>
        </div>
      </footer>

      {statusOpen && (
        <Sheet label="Masa durumu" onClose={() => setStatusOpen(false)}>
          <div style={{ display: 'grid', gap: 16 }}>{status}</div>
        </Sheet>
      )}
      {finalizeOpen && isHost && <FinalizeScreen ctx={ctx} views={views} onBack={() => setFinalizeOpen(false)} onGoTo={goToItem} />}
      {splitFor && <SplitSheet ctx={ctx} view={splitFor} onClose={() => setSplitFor(null)} />}
      {conflictView && conflictView.item.splitType === SplitType.Quantity && conflictView.open === 0 && (
        <ConflictSheet ctx={ctx} view={conflictView} mine={mineOf(conflictView)} onClose={() => setConflictId(null)} />
      )}
    </main>
  )
}

function TypeTag({ ctx, view, onSplit }: { ctx: TableCtx; view: ItemView; onSplit: () => void }) {
  const shared = view.item.splitType === SplitType.Shared
  const content = (
    <>
      <Icon name={shared ? 'circles' : 'minus'} size={13} />
      {shared ? 'Paylaşımlı' : 'Adetli'}
      {ctx.isHost && <Icon name="pencil" size={11} />}
    </>
  )
  const cls = `tag ${shared ? 'shared' : 'qty'}`
  // Host için etiketin kendisi bölüşme tipini değiştiren butondur.
  return ctx.isHost ? (
    <button type="button" className={`${cls} tag-btn`} onClick={onSplit} aria-label={`${view.item.name} bölüşme tipini değiştir`}>
      {content}
    </button>
  ) : (
    <span className={cls}>{content}</span>
  )
}

function ItemCard({
  ctx,
  view,
  mine,
  onToggle,
  onChange,
  onSplit,
}: {
  ctx: TableCtx
  view: ItemView
  mine: number
  onToggle: () => void
  onChange: (delta: 1 | -1) => void
  onSplit: () => void
}) {
  const { bill, me, busy } = ctx
  const { item } = view
  const shared = item.splitType === SplitType.Shared
  const total = item.quantity * item.unitPrice
  const cls = `item${mine > 0 ? ' mine' : ''}`

  if (shared) {
    return (
      <div className={cls} id={`item-${item.id}`}>
        <button type="button" className="item-main" onClick={onToggle} disabled={busy} aria-pressed={mine > 0}>
          <span className="top">
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>{item.name}</span>
              <span className="meta" style={{ display: 'block' }}>
                {item.quantity} × {formatMoney(item.unitPrice)} · {view.selections.length > 0 ? `${view.selections.length} kişi bölüşüyor` : 'henüz kimse yok'}
              </span>
            </span>
            <span className="amount">{formatMoney(total)}</span>
          </span>
        </button>
        <div className="bottom">
          <TypeTag ctx={ctx} view={view} onSplit={onSplit} />
          <span className="av-stack" style={{ flex: 1 }}>
            {view.selections.map((s) => {
              const person = bill.participants.find((p) => p.id === s.participantId)
              return person ? <Avatar key={s.id} bill={bill} participantId={person.id} name={person.username} me={person.id === me.id} /> : null
            })}
          </span>
          <button type="button" className="cta" onClick={onToggle} disabled={busy} aria-pressed={mine > 0}>
            {mine > 0 ? 'Bende ✓' : 'Bana ekle'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cls} id={`item-${item.id}`}>
      <div className="top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{item.name}</div>
          <div className="meta">
            {item.quantity} adet × {formatMoney(item.unitPrice)}
          </div>
        </div>
        <button type="button" className="step" onClick={() => onChange(-1)} disabled={busy || mine === 0} aria-label={`${item.name} bir azalt`}>
          <Icon name="minus" size={18} />
        </button>
        <div className="qty-n" aria-live="polite">{mine}</div>
        <button type="button" className="step" onClick={() => onChange(1)} disabled={busy || view.open === 0} aria-label={`${item.name} bir artır`}>
          <Icon name="plus" size={18} />
        </button>
      </div>
      <div className="pips" aria-hidden="true">
        {item.quantity > MAX_PIPS ? (
          <>
            {view.selections.map((s) => (
              <div
                key={s.id}
                className="pip"
                style={{ flexGrow: s.quantity, background: pipColor(ctx, s.participantId), borderColor: s.participantId === me.id ? 'var(--tomato)' : undefined }}
              />
            ))}
            {view.open > 0 && <div className="pip free" style={{ flexGrow: view.open }} />}
          </>
        ) : (
          <>
            {view.selections.flatMap((s) =>
              Array.from({ length: s.quantity }, (_, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="pip"
                  style={{ background: pipColor(ctx, s.participantId), borderColor: s.participantId === me.id ? 'var(--tomato)' : undefined }}
                />
              )),
            )}
            {Array.from({ length: view.open }, (_, i) => (
              <div key={`free-${i}`} className="pip free" />
            ))}
          </>
        )}
      </div>
      <div className="pipnote">
        <span className={view.open > 0 ? 'open' : undefined}>{view.open === 0 ? (mine > 0 ? 'Tamamı dağıldı' : 'Hepsi kapıldı') : `${view.open} adet sahipsiz`}</span>
        <TypeTag ctx={ctx} view={view} onSplit={onSplit} />
      </div>
    </div>
  )
}

function pipColor(ctx: TableCtx, participantId: string) {
  const index = ctx.bill.participants.findIndex((p) => p.id === participantId)
  const colors = ['#FFD23F', '#FFB3D1', '#8FD3FF', '#CDEB4B', '#B9A6FF', '#FFC4A3', '#A8E6CF']
  return colors[(index < 0 ? 0 : index) % colors.length]
}

function LockedMini({ open }: { open: number }) {
  return (
    <div className="mini">
      <Icon name="lock" size={20} />
      <div>
        {open === 0 ? (
          <b>Payın hesaplanıyor…</b>
        ) : (
          <>
            <b>Tutarın henüz yok.</b> {open} kalem sahipsiz; hepsi paylaşılınca payın burada görünür.
          </>
        )}
      </div>
    </div>
  )
}

function MyShareMini({ calculation, meId }: { calculation: BillCalculation; meId: string }) {
  const mine = calculation.participants.find((p) => p.participantId === meId)
  if (!mine) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Senin payın · güncel</div>
        <div className="mono" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{formatMoney(mine.total)}</div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', lineHeight: 1.35, maxWidth: 150 }}>
        Değişebilir. Host hesabı kesince kilitlenir.
      </div>
    </div>
  )
}

function ReadyButton({ ctx }: { ctx: TableCtx }) {
  const { me, bill, busy } = ctx
  const offline = ctx.connection === 'offline'
  return (
    <button
      type="button"
      className={`btn ${me.isReady ? 'ok' : ''}`}
      style={{ fontWeight: 800 }}
      disabled={busy || offline}
      aria-pressed={me.isReady}
      onClick={() => void ctx.act((token) => api.setReady(bill.id, !me.isReady, token))}
    >
      {offline ? (
        'Bağlantı bekleniyor…'
      ) : (
        <>
          {me.isReady && <Icon name="check" size={20} />}
          {me.isReady ? 'Hazır · Geri al' : 'Seçimim bitti'}
        </>
      )}
    </button>
  )
}

function ConflictSheet({ ctx, view, mine, onClose }: { ctx: TableCtx; view: ItemView; mine: number; onClose: () => void }) {
  const { bill, me } = ctx
  const { item } = view
  return (
    <Sheet label={`${item.name} adetleri`} onClose={onClose}>
      <div role="alert" style={{ background: 'var(--tomato)', border: '2px solid var(--ink)', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 3px 0 var(--ink)' }}>
        <Icon name="warn" size={22} />
        <div style={{ fontSize: 15, lineHeight: 1.35, fontWeight: 600 }}>
          <b>Bu kalemde sahipsiz adet kalmadı.</b> Biri senden önce aldı; masayı güncelledik.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{item.name}</div>
          <div className="mono" style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
            {item.quantity} adet × {formatMoney(item.unitPrice)} · Adetli
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        {view.selections.flatMap((s) => {
          const person = bill.participants.find((p) => p.id === s.participantId)
          return Array.from({ length: item.quantity > MAX_PIPS ? 1 : s.quantity }, (_, i) => (
            <div
              key={`${s.id}-${i}`}
              style={{
                flex: 1,
                minHeight: 92,
                border: s.participantId === me.id ? '3px solid var(--ink)' : '2px solid var(--ink)',
                borderRadius: 16,
                background: pipColor(ctx, s.participantId),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: 13,
                padding: 4,
                textAlign: 'center',
              }}
            >
              {person && <Avatar bill={bill} participantId={person.id} name={person.username} />}
              {s.participantId === me.id ? 'Sen' : person?.username}
              {item.quantity > MAX_PIPS && <span className="mono">{s.quantity} adet</span>}
            </div>
          ))
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 10 }}>
        <span>Hepsi kapıldı</span>
        <span className="mono" style={{ fontWeight: 500 }}>0 sahipsiz</span>
      </div>

      <div style={{ marginTop: 18, background: 'var(--white)', border: '2px solid var(--ink)', borderRadius: 20, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>Senin adedin</div>
        <button type="button" className="step" disabled={mine === 0 || ctx.busy} onClick={() => void ctx.act((token) => (mine <= 1 ? api.removeSelection(bill.id, item.id, token) : api.changeQuantity(bill.id, item.id, mine - 1, token)))} aria-label="Bir azalt">
          <Icon name="minus" size={20} />
        </button>
        <div className="mono" style={{ fontSize: 30, fontWeight: 500, width: 30, textAlign: 'center' }}>{mine}</div>
        <button type="button" className="step" disabled aria-label="Bir artır, sahipsiz adet kalmadı">
          <Icon name="plus" size={20} />
        </button>
      </div>
      <p style={{ margin: '12px 2px 0', fontSize: 14, lineHeight: 1.4, color: '#3d372f' }}>
        Bir adet daha içtiysen masadakilerle konuşun; biri bırakınca burada artı butonu açılır.
      </p>

      <div style={{ marginTop: 18 }}>
        <button className="btn dark" type="button" onClick={onClose}>
          Tamam
        </button>
      </div>
    </Sheet>
  )
}

function StatusPanel({
  ctx,
  views,
  distributed,
  calculation,
}: {
  ctx: TableCtx
  views: ItemView[]
  distributed: boolean
  calculation: BillCalculation | null
}) {
  const { bill, me, isHost } = ctx
  const readyCount = bill.participants.filter((p) => p.isReady).length
  const waiting = bill.participants.filter((p) => !p.isReady)
  const openViews = views.filter((v) => !v.complete)
  const mine = calculation?.participants.find((p) => p.participantId === me.id)

  return (
    <>
      <div className="panel dark">
        <div style={{ fontSize: 14, fontWeight: 700, color: '#cfc8ba' }}>Senin payın</div>
        {mine && calculation ? (
          <>
            <div className="mytotal">{formatMoney(mine.total)}</div>
            <div style={{ fontSize: 13, color: '#cfc8ba', marginTop: 4 }}>
              Güncel tutar; masada bir şey değişirse değişebilir. Host hesabı kesince kilitlenir.
            </div>
          </>
        ) : (
          <div className="lockrow" style={{ marginTop: 8, fontSize: 15 }}>
            <span style={{ color: 'var(--sun)', flex: 'none', marginTop: 2 }}>
              <Icon name="lock" size={20} />
            </span>
            <span>
              {openViews.length === 0 ? (
                <b>Payın hesaplanıyor…</b>
              ) : (
                <>
                  <b>Tutarın henüz yok.</b> {openViews.length} kalem sahipsiz; hepsi paylaşılınca payın burada görünür.
                </>
              )}
            </span>
          </div>
        )}
        <div style={{ marginTop: 16 }} className="desktop-only">
          <ReadyButton ctx={ctx} />
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>Masadakiler</h2>
          <span className="mono" style={{ fontSize: 14 }}>{readyCount}/{bill.participants.length} hazır</span>
        </div>
        <div style={{ marginTop: 8 }}>
          {bill.participants.map((p) => (
            <div className="prow" key={p.id} style={{ padding: '8px 0' }}>
              <Avatar bill={bill} participantId={p.id} name={p.username} me={p.id === me.id} />
              <span className="name" style={{ fontSize: 16 }}>
                {p.username}
                {p.id === me.id ? ' (sen)' : ''}
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>
                  {new Set(bill.selections.filter((s) => s.participantId === p.id).map((s) => s.billItemId)).size} kalem
                </span>
              </span>
              <span className={`status${p.isReady ? ' ready' : ''}`}>{p.isReady ? 'Hazır' : 'Henüz değil'}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="panel sunny">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="crown" size={18} />
            Hesabı kes
          </h2>
          <div style={{ marginTop: 8 }}>
            <div className="check">
              <span className={`box${distributed ? '' : ' bad'}`}>{distributed ? <Icon name="check" size={14} /> : <span className="mono" style={{ fontSize: 12 }}>{openViews.length}</span>}</span>
              <div>
                {distributed ? 'Bütün kalemlerin sahibi var' : 'Bütün kalemler dağılmalı'}
                {!distributed && (
                  <div className="mono" style={{ fontWeight: 400, marginTop: 4 }}>
                    {openViews.slice(0, 3).map((v) => v.item.name).join(', ')}
                    {openViews.length > 3 ? ` +${openViews.length - 3}` : ''}
                  </div>
                )}
              </div>
            </div>
            <div className="check">
              <span className={`box${waiting.length === 0 ? '' : ' bad'}`}>
                {waiting.length === 0 ? <Icon name="check" size={14} /> : <span className="mono" style={{ fontSize: 12 }}>{waiting.length}</span>}
              </span>
              <div>
                {waiting.length === 0 ? 'Herkes hazır' : 'Herkes hazır olmalı'}
                {waiting.length > 0 && <div style={{ fontWeight: 400, marginTop: 4 }}>Bekleniyor: {waiting.map((p) => p.username).join(', ')}</div>}
              </div>
            </div>
          </div>
          <button
            className="btn"
            type="button"
            style={{ marginTop: 14 }}
            disabled={ctx.busy || !distributed || waiting.length > 0}
            onClick={() => void ctx.act((token) => api.finalize(bill.id, token))}
          >
            <Icon name="lock" size={20} />
            Hesabı kes
          </button>
        </div>
      )}
    </>
  )
}

function SplitSheet({ ctx, view, onClose }: { ctx: TableCtx; view: ItemView; onClose: () => void }) {
  const { item } = view
  const [value, setValue] = useState<SplitTypeValue>(item.splitType)
  const changed = value !== item.splitType
  const affected = view.selections.map((s) => ctx.bill.participants.find((p) => p.id === s.participantId)).filter((p) => p !== undefined)

  const save = async () => {
    if (!changed) return onClose()
    const ok = await ctx.act((token) => api.changeSplitType(ctx.bill.id, item.id, value, token))
    if (ok) onClose()
  }

  return (
    <Sheet label={`${item.name} bölüşme tipi`} onClose={onClose}>
      <span className="pill">
        <Icon name="crown" size={14} />
        Yalnız host görür
      </span>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, marginTop: 12 }}>
        {item.name}
        <br />
        nasıl bölünsün?
      </div>
      <div className="mono" style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
        {item.quantity} adet × {formatMoney(item.unitPrice)}
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        <button type="button" className={`opt${value === SplitType.Quantity ? ' on' : ''}`} aria-pressed={value === SplitType.Quantity} onClick={() => setValue(SplitType.Quantity)}>
          <span className="radio">{value === SplitType.Quantity && <i />}</span>
          <span>
            <b style={{ display: 'block', fontSize: 17 }}>Adetli</b>
            <span style={{ fontSize: 14, lineHeight: 1.35, color: '#3d372f' }}>Herkes kaç tane aldıysa onu öder.</span>
          </span>
        </button>
        <button type="button" className={`opt${value === SplitType.Shared ? ' on' : ''}`} aria-pressed={value === SplitType.Shared} onClick={() => setValue(SplitType.Shared)}>
          <span className="radio">{value === SplitType.Shared && <i />}</span>
          <span>
            <b style={{ display: 'block', fontSize: 17 }}>Paylaşımlı</b>
            <span style={{ fontSize: 14, lineHeight: 1.35, color: '#3d372f' }}>Ortaya geldi; seçen herkes eşit böler.</span>
          </span>
        </button>
      </div>

      {changed && affected.length > 0 && (
        <div className="note" style={{ marginTop: 16, borderColor: 'var(--danger)' }}>
          <Icon name="warn" size={22} />
          <div>
            <b>Bu kalemdeki {affected.length} seçim silinecek.</b> {affected.map((p) => p.username).join(', ')} yeniden seçmek zorunda kalacak; hazır olanlar beklemeye döner.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        <button className="btn" type="button" onClick={() => void save()} disabled={ctx.busy}>
          {ctx.busy ? (
            <>
              <Icon name="spinner" spin />
              Kaydediliyor…
            </>
          ) : changed ? (
            value === SplitType.Shared ? 'Paylaşımlı yap' : 'Adetli yap'
          ) : (
            'Tamam'
          )}
        </button>
        <button className="btn alt" type="button" onClick={onClose}>
          Vazgeç
        </button>
      </div>
    </Sheet>
  )
}
