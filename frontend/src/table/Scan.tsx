import { useRef, useState, type ChangeEvent } from 'react'
import { ApiError, api, type ReceiptDraft } from '../api'
import { ErrorScreen, Icon } from '../ui'
import type { TableCtx } from './types'

const MAX_BYTES = 10 * 1024 * 1024

type Reason = 'toolarge' | 'format' | 'unreadable' | 'upstream' | 'server' | 'network' | 'auth'
type State = { kind: 'pick' } | { kind: 'reading' } | { kind: 'error'; reason: Reason }

export default function Scan({ ctx, onDraft, onCancel }: { ctx: TableCtx; onDraft: (draft: ReceiptDraft) => void; onCancel: () => void }) {
  const [state, setState] = useState<State>({ kind: 'pick' })
  const [file, setFile] = useState<File | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const parse = async (image: File) => {
    setFile(image)
    if (image.size > MAX_BYTES) return setState({ kind: 'error', reason: 'toolarge' })
    setState({ kind: 'reading' })
    try {
      const draft = await api.parseReceipt(ctx.bill.id, image, ctx.token)
      if (!draft.items || draft.items.length === 0) return setState({ kind: 'error', reason: 'unreadable' })
      onDraft(draft)
    } catch (error) {
      const kind = error instanceof ApiError ? error.kind : 'server'
      const reason: Reason =
        kind === 'toolarge' ? 'toolarge' : kind === 'upstream' ? 'upstream' : kind === 'invalid' ? 'format' : kind === 'network' ? 'network' : kind === 'auth' || kind === 'forbidden' ? 'auth' : 'server'
      setState({ kind: 'error', reason })
    }
  }

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0]
    event.target.value = ''
    if (image) void parse(image)
  }

  const inputs = (
    <>
      <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onPick} />
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
    </>
  )

  const retake = (
    <button className="btn" type="button" onClick={() => camera.current?.click()}>
      <Icon name="camera" size={22} />
      Yeniden çek
    </button>
  )
  const back = (
    <button className="btn alt" type="button" onClick={onCancel}>
      Vazgeç
    </button>
  )
  const again = file && (
    <button className="btn alt" type="button" onClick={() => void parse(file)}>
      Aynı fotoğrafı tekrar dene
    </button>
  )

  if (state.kind === 'error') {
    const { reason } = state
    if (reason === 'toolarge') {
      return (
        <>
          {inputs}
          <ErrorScreen icon="image" tone="var(--pink)" title={<>Bu fotoğraf biraz büyük kaçtı.</>} text="En fazla 10 MB yükleyebilirsin. Kamerayla yeniden çekmen genelde yeter.">
            {retake}
            <button className="btn alt" type="button" onClick={() => gallery.current?.click()}>Galeriden başka fotoğraf seç</button>
            {back}
          </ErrorScreen>
        </>
      )
    }
    if (reason === 'format') {
      return (
        <>
          {inputs}
          <ErrorScreen icon="image" tone="var(--pink)" title={<>Bu dosyayı<br />okuyamadık.</>} text="JPEG, PNG ya da WebP bir fotoğraf olmalı. PDF veya HEIC kabul etmiyoruz.">
            {retake}
            <button className="btn alt" type="button" onClick={() => gallery.current?.click()}>Galeriden başka fotoğraf seç</button>
            {back}
          </ErrorScreen>
        </>
      )
    }
    if (reason === 'unreadable') {
      return (
        <>
          {inputs}
          <ErrorScreen
            icon="receipt"
            tone="var(--sun)"
            title="Fişi okuyamadık."
            text="Hiç kalem çıkaramadık. Fiş buruşuk, bulanık ya da kenarları kadraj dışı kalmış olabilir."
            tips={
              <>
                <div className="tip">
                  <span className="ico" style={{ background: 'var(--sun)' }}><Icon name="info" size={22} /></span>
                  <div><b>Işığa tut.</b> Gölge düşmesin, parlama olmasın.</div>
                </div>
                <div className="tip">
                  <span className="ico" style={{ background: 'var(--sky)' }}><Icon name="camera" size={22} /></span>
                  <div><b>Tamamı kadrajda olsun.</b> Üstten alta bütün fiş görünsün.</div>
                </div>
                <div className="tip">
                  <span className="ico" style={{ background: 'var(--lime)' }}><Icon name="receipt" size={22} /></span>
                  <div><b>Düz bir yüzeye koy.</b> Buruşukları elinle düzleştir.</div>
                </div>
              </>
            }
          >
            {retake}
            {again}
            {back}
          </ErrorScreen>
        </>
      )
    }
    if (reason === 'upstream') {
      return (
        <>
          {inputs}
          <ErrorScreen icon="receipt" tone="var(--sun)" title={<>Fiş okuma servisi<br />yanıt vermedi.</>} text="Fotoğrafın sorunu değil; okuma servisi bir an cevap veremedi. Aynı fotoğrafla tekrar deneyebilirsin.">
            {again ?? retake}
            {back}
          </ErrorScreen>
        </>
      )
    }
    if (reason === 'network') {
      return (
        <>
          {inputs}
          <ErrorScreen icon="wifioff" tone="var(--sky)" title={<>İnternet masadan<br />kalktı.</>} text="Fotoğraf gitmedi. Bağlantı gelince aynı fotoğrafı tekrar deneyebilirsin.">
            {again ?? retake}
            {back}
          </ErrorScreen>
        </>
      )
    }
    if (reason === 'auth') {
      return (
        <>
          {inputs}
          <ErrorScreen icon="key" tone="var(--lavender)" title="Bunu sadece host yapabilir." text="Fişi okutma yetkisi masayı kuran kişide. Sayfayı yenileyip tekrar dene.">
            {back}
          </ErrorScreen>
        </>
      )
    }
    return (
      <>
        {inputs}
        <ErrorScreen icon="server" tone="var(--sun)" title={<>Sunucu bir an<br />nefes aldı.</>} text="Bu bizim tarafımızdaki bir aksilik, senin suçun yok. Aynı fotoğrafla tekrar denemen yeterli.">
          {again ?? retake}
          {back}
        </ErrorScreen>
      </>
    )
  }

  if (state.kind === 'reading') {
    return (
      <main className="scan">
        <div className="narrow">
          <div className="mono" style={{ fontSize: 12, letterSpacing: '0.14em', color: '#cfc8ba' }}>
            FİŞ · {file ? (file.size / (1024 * 1024)).toFixed(1).replace('.', ',') : '–'} MB
          </div>
          <h1 className="h1-sm" style={{ marginTop: 8 }}>
            Fişi okuyoruz<span style={{ color: 'var(--lime)' }}>…</span>
          </h1>
          <p style={{ marginTop: 8, fontSize: 15, color: '#cfc8ba' }}>Az kaldı. Bu arada kimse “ben sana atarım” demesin.</p>

          <div className="scan-paper" aria-hidden="true">
            <div className="zz">
              <div className="ln" style={{ width: '50%', margin: '0 auto 6px', background: 'var(--ink)', height: 9 }} />
              {[58, 44, 62, 38, 54, 46, 58].map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="ln" style={{ width: `${w}%` }} />
                  <div className="ln" style={{ width: '22%' }} />
                </div>
              ))}
              <div style={{ borderTop: '2px dashed var(--ink)', margin: '6px 0 2px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="ln" style={{ width: '30%', background: 'var(--ink)' }} />
                <div className="ln" style={{ width: '30%', background: 'var(--ink)' }} />
              </div>
            </div>
            <div className="scan-line" />
          </div>

          <div style={{ marginTop: 28, background: '#26221c', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--lime)', flex: 'none' }}>
              <Icon name="pencil" size={22} />
            </span>
            <div style={{ fontSize: 15, lineHeight: 1.4, color: '#e9e3d6' }}>
              Okunan kalemler masaya düşmeden önce sana gelecek. Yanlış okunan bir şey olursa düzeltirsin.
            </div>
          </div>

          <div className="indet" role="progressbar" aria-label="Fiş okunuyor" style={{ marginTop: 28 }} />
        </div>
      </main>
    )
  }

  return (
    <main className="narrow">
      {inputs}
      <h1 className="h1" style={{ marginTop: 28 }}>
        Fişi okutalım.
      </h1>
      <p className="lead" style={{ marginTop: 12 }}>
        Fişin tamamı görünsün, ışığa tut. JPEG, PNG ya da WebP; en fazla 10 MB.
      </p>
      <div className="pickzone">
        <button className="btn" type="button" onClick={() => camera.current?.click()}>
          <Icon name="camera" size={22} />
          Kamerayla çek
        </button>
        <button className="btn alt" type="button" onClick={() => gallery.current?.click()}>
          Galeriden seç
        </button>
      </div>
      <div className="spacer" style={{ minHeight: 24 }} />
      {back}
    </main>
  )
}
