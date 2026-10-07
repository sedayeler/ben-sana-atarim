import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, isFinalized, type BillDetails, type ReceiptDraft } from '../api'
import { clearSession, normalizeCode } from '../lib'
import Lobby, { GuestWaiting } from '../table/Lobby'
import Result from '../table/Result'
import Review from '../table/Review'
import Scan from '../table/Scan'
import Selection from '../table/Selection'
import type { TableCtx } from '../table/types'
import { useToast } from '../toast'
import { useBill } from '../useBill'
import { ConnectionBanner, ErrorScreen, Icon, LoadingScreen, Sheet } from '../ui'

type HostView = 'main' | 'scan' | 'review'

export default function Table() {
  const params = useParams()
  const code = normalizeCode(params.code ?? '')
  const navigate = useNavigate()
  const toast = useToast()
  const { bill, setBill, load, connection, reload, updatedAt } = useBill(code)
  const [reopened, setReopened] = useState(false)

  const [busy, setBusy] = useState(false)
  const [hostView, setHostView] = useState<HostView>('main')
  const [draft, setDraft] = useState<ReceiptDraft | null>(null)
  const [accessLost, setAccessLost] = useState(false)
  const [lockedNotice, setLockedNotice] = useState(false)

  const session = load.kind === 'ready' ? load.session : null
  const me = bill && session ? bill.participants.find((p) => p.id === session.participantId) : undefined

  // Kullanıcının kendi işlemi olmadan "hazır" işareti düştüyse bunu söyle.
  const wasReady = useRef(false)
  const lastActionAt = useRef(0)
  useEffect(() => {
    if (!me) return
    if (wasReady.current && !me.isReady && Date.now() - lastActionAt.current > 1500) {
      toast.show('Masada bir şey değişti, hazır işaretin kalktı. Hazırsan tekrar bas.', 'warn')
    }
    wasReady.current = me.isReady
  }, [me, toast])

  const act = useCallback<TableCtx['act']>(
    async (fn, options) => {
      if (!session) return false
      lastActionAt.current = Date.now()
      setBusy(true)
      try {
        const next = await fn(session.accessToken)
        setBill(next)
        return true
      } catch (error) {
        const kind = error instanceof ApiError ? error.kind : 'server'
        if (kind === 'auth') {
          setAccessLost(true)
        } else if (kind === 'network') {
          toast.show('İnternet masadan kalktı. Bağlantı gelince tekrar dene.', 'error')
        } else if (kind === 'forbidden') {
          toast.show('Bunu sadece host yapabilir. Host’a söyle.', 'warn')
        } else if (kind === 'conflict' || kind === 'invalid' || kind === 'notfound') {
          // Nedeni metinden okumayız; masayı yeniden okuyup duruma göre davranırız.
          try {
            const fresh = await api.getBill(code)
            setBill(fresh)
            if (isFinalized(fresh)) setLockedNotice(true)
            else if (!(options?.quietConflict && kind === 'conflict')) toast.show('Bu işlem geçmedi. Masayı güncelledik, bir daha dene.', 'warn')
          } catch {
            toast.show('Bu işlem geçmedi. Bağlantını kontrol edip tekrar dene.', 'error')
          }
        } else {
          toast.show('Sunucu bir an nefes aldı. İşlemin gitmedi.', 'error', {
            label: 'Tekrar dene',
            run: () => void act(fn, options),
          })
        }
        return false
      } finally {
        setBusy(false)
      }
    },
    [session, setBill, code, toast],
  )

  // Masa değişince ya da hesap kesilince host görünümü sıfırlanır.
  useEffect(() => {
    if (bill && isFinalized(bill)) setHostView('main')
  }, [bill])

  // Bağlantı geri gelince haber ver.
  const lastConnection = useRef(connection)
  useEffect(() => {
    if (lastConnection.current !== 'live' && connection === 'live') {
      toast.show('Geri bağlandın. Masa güncellendi.', 'success')
    }
    lastConnection.current = connection
  }, [connection, toast])

  // Hesap yeniden açıldığında kısa bir şerit göster.
  const wasFinalized = useRef(false)
  useEffect(() => {
    if (!bill) return
    const finalizedNow = isFinalized(bill)
    // Yeniden açmayı bu istemci kendisi yaptıysa (host) şerit gösterilmez.
    const ownAction = Date.now() - lastActionAt.current < 5000
    if (wasFinalized.current && !finalizedNow && !ownAction) {
      setReopened(true)
      const timer = window.setTimeout(() => setReopened(false), 9000)
      wasFinalized.current = finalizedNow
      return () => window.clearTimeout(timer)
    }
    wasFinalized.current = finalizedNow
  }, [bill])

  if (code.length !== 12 || load.kind === 'notfound') {
    return (
      <ErrorScreen icon="warn" tone="var(--pink)" title="Bu masa bulunamadı." text="Bu kodla bir masa yok. Bir harf kayıvermiş olabilir; hostun attığı kodla karşılaştır. Kodda 0, O, 1 ve I harfi hiç kullanılmaz.">
        <Link className="btn" to="/katil">Kodu yeniden gir</Link>
        <Link className="btn alt" to="/">Ana sayfaya dön</Link>
      </ErrorScreen>
    )
  }

  if (load.kind === 'error') {
    return (
      <ErrorScreen icon="server" tone="var(--sun)" title={<>Sunucu bir an<br />nefes aldı.</>} text="Bu bizim tarafımızdaki bir aksilik, senin suçun yok. Tekrar denemen yeterli.">
        <button className="btn" type="button" onClick={reload}>
          <Icon name="retry" />
          Tekrar dene
        </button>
        <Link className="btn alt" to="/">Ana sayfaya dön</Link>
      </ErrorScreen>
    )
  }

  if ((load.kind === 'noaccess' || accessLost) && bill && isFinalized(bill)) {
    return (
      <ErrorScreen icon="key" tone="var(--lavender)" title={<>Bu hesap kesilmiş.</>} text="Bu cihazda masadaki yerini bulamadık ve hesap kesildiği için yeni kimse katılamıyor. Host hesabı yeniden açarsa tekrar deneyebilirsin.">
        <button className="btn" type="button" onClick={() => window.location.reload()}>
          <Icon name="retry" />
          Tekrar dene
        </button>
        <Link className="btn alt" to="/">Ana sayfaya dön</Link>
      </ErrorScreen>
    )
  }

  if (load.kind === 'noaccess' || accessLost) {
    return (
      <ErrorScreen
        icon="key"
        tone="var(--lavender)"
        title={<>Bu cihazda<br />yerini bulamadık.</>}
        text="Masadaki yerini hatırlayan kayıt bu cihazda yok ya da geçersiz. Tarayıcı verisi silinmiş veya masayı başka bir cihazdan açıyor olabilirsin."
      >
        <div className="note" style={{ textAlign: 'left' }}>
          <Icon name="info" />
          <div>
            Masaya yeniden katılmayı deneyebilirsin. Eski yerin geri alınamıyor; aynı ad masada hâlâ kullanılıyorsa başka bir ad seçmen gerekir.
          </div>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => {
            clearSession(code)
            navigate(`/katil/${code}`)
          }}
        >
          Masaya yeniden katıl
        </button>
      </ErrorScreen>
    )
  }

  if (load.kind === 'loading' || !bill || !session || !me) return <LoadingScreen />

  const ctx: TableCtx = { bill, me, isHost: me.isHost, token: session.accessToken, busy, connection, act }
  const finalized = isFinalized(bill)

  let body
  if (finalized) {
    body = <Result ctx={ctx} />
  } else if (me.isHost && hostView === 'scan') {
    body = <Scan ctx={ctx} onDraft={(next) => { setDraft(next); setHostView('review') }} onCancel={() => setHostView('main')} />
  } else if (me.isHost && hostView === 'review') {
    body = (
      <Review
        ctx={ctx}
        draft={draft ?? itemsToDraft(bill)}
        onRescan={() => setHostView('scan')}
        onBack={() => setHostView('main')}
        onDone={() => setHostView('main')}
      />
    )
  } else if (bill.items.length === 0) {
    body = me.isHost ? <Lobby ctx={ctx} onScan={() => setHostView('scan')} /> : <GuestWaiting ctx={ctx} />
  } else {
    body = <Selection ctx={ctx} onEditReceipt={() => { setDraft(itemsToDraft(bill)); setHostView('review') }} />
  }

  return (
    <>
      <ConnectionBanner state={connection} onRetry={reload} updatedAt={updatedAt} />
      {reopened && !finalized && (
        <div className="banner reopened" role="status">
          <Icon name="retry" size={22} />
          <div style={{ flex: 1 }}>
            <b>Hesap yeniden açıldı.</b>
            <span className="sub">Seçimlerin duruyor; yine “Seçimim bitti” demen gerekiyor.</span>
          </div>
          <button type="button" className="ib" onClick={() => setReopened(false)} aria-label="Kapat">
            <Icon name="plus" size={18} />
          </button>
        </div>
      )}
      {body}
      {lockedNotice && finalized && (
        <Sheet label="Hesap kesilmiş" onClose={() => setLockedNotice(false)}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ border: '4px solid var(--danger)', color: 'var(--danger)', borderRadius: 12, padding: '4px 10px', fontWeight: 800, fontSize: 22, flex: 'none' }}>KESİLDİ</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Hesap kesilmiş,<br />bu işlem geçmedi.</div>
          </div>
          <p className="lead" style={{ marginTop: 14 }}>
            Host hesabı kapattığı için seçimler ve hazır durumu kilitli. Bir şeyin yanlış olduğunu düşünüyorsan hostun hesabı yeniden açması gerekiyor.
          </p>
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            <button className="btn" type="button" onClick={() => setLockedNotice(false)}>Sonucu gör</button>
          </div>
        </Sheet>
      )}
    </>
  )
}

function itemsToDraft(bill: BillDetails): ReceiptDraft {
  return {
    serviceCharge: bill.serviceCharge,
    items: bill.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
  }
}
