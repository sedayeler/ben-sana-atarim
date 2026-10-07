import { SplitType, api } from '../api'
import { Avatar, Icon } from '../ui'
import type { ItemView } from './derive'
import type { TableCtx } from './types'

// Host'un hesabı kesmeden önce eksikleri gördüğü tam ekran. Liste, ekranda gösterilen dağılım özetinden
// türetilir; kesin doğrulamayı finalize isteğinde backend yapar.
export default function FinalizeScreen({
  ctx,
  views,
  onBack,
  onGoTo,
}: {
  ctx: TableCtx
  views: ItemView[]
  onBack: () => void
  onGoTo: (itemId: string) => void
}) {
  const { bill } = ctx
  const openShared = views.filter((v) => v.item.splitType === SplitType.Shared && !v.complete)
  const openQty = views.filter((v) => v.item.splitType === SplitType.Quantity && !v.complete)
  const waiting = bill.participants.filter((p) => !p.isReady)
  const ready = openShared.length === 0 && openQty.length === 0 && waiting.length === 0

  const check = (ok: boolean, count: number) => (
    <span className={`box${ok ? '' : ' bad'}`}>
      {ok ? <Icon name="check" size={16} /> : <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{count}</span>}
    </span>
  )

  const goTo = (id: string) => (
    <button type="button" className="linkbtn" onClick={() => onGoTo(id)}>
      Kaleme git
      <Icon name="right" size={14} />
    </button>
  )

  return (
    <div className="fscreen" role="dialog" aria-modal="true" aria-label="Hesabı kes">
      <div className="narrow">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="ib" onClick={onBack} aria-label="Geri">
            <Icon name="left" />
          </button>
          <span className="pill">
            <Icon name="crown" size={14} />
            Host
          </span>
        </div>

        <h1 className="h1" style={{ marginTop: 22, fontSize: 40 }}>
          {ready ? (
            <>
              Hesabı kesmeye
              <br />
              hazırsın.
            </>
          ) : (
            <>
              Hesabı kesmeye
              <br />
              az kaldı.
            </>
          )}
        </h1>
        <p className="lead" style={{ marginTop: 10 }}>
          {ready ? 'Her şey tamam. Kestiğinde tutarlar kilitlenir.' : 'Eksikler tamamlanınca buton kendiliğinden açılır.'}
        </p>

        <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
          <div className={`chk${openShared.length ? ' bad' : ''}`}>
            {check(openShared.length === 0, openShared.length)}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Paylaşımlı kalemlerin hepsinin sahibi var</div>
              {openShared.map((v) => (
                <div key={v.item.id}>
                  <div className="mono" style={{ fontSize: 14, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{v.item.name}</span>
                    <span style={{ color: 'var(--danger)' }}>kimse seçmedi</span>
                  </div>
                  {goTo(v.item.id)}
                </div>
              ))}
            </div>
          </div>

          <div className={`chk${openQty.length ? ' bad' : ''}`}>
            {check(openQty.length === 0, openQty.length)}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Adetli kalemler tam dağılmalı</div>
              {openQty.map((v) => (
                <div key={v.item.id}>
                  <div className="mono" style={{ fontSize: 14, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{v.item.name}</span>
                    <span style={{ color: 'var(--danger)' }}>
                      {v.taken}/{v.item.quantity} · {v.open} sahipsiz
                    </span>
                  </div>
                  {goTo(v.item.id)}
                </div>
              ))}
            </div>
          </div>

          <div className={`chk${waiting.length ? ' bad' : ''}`}>
            {check(waiting.length === 0, waiting.length)}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Herkes hazır olmalı</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>
                {bill.participants.length - waiting.length} / {bill.participants.length} hazır{waiting.length > 0 ? ' · bekleniyor:' : ''}
              </div>
              {waiting.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {waiting.map((p) => (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
                      <Avatar bill={bill} participantId={p.id} name={p.username} />
                      {p.username}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="spacer" style={{ minHeight: 24 }} />
        <button
          className="btn"
          type="button"
          disabled={!ready || ctx.busy}
          onClick={() => void ctx.act((token) => api.finalize(bill.id, token))}
        >
          <Icon name="lock" size={20} />
          Hesabı kes
        </button>
      </div>
    </div>
  )
}
