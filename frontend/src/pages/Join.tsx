import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, isFinalized, type BillDetails } from '../api'
import { loadSession, normalizeCode, possessive, saveSession } from '../lib'
import { BackLink, Icon } from '../ui'

type CodeState = 'idle' | 'checking' | 'found' | 'notfound' | 'closed' | 'failed'

export default function Join() {
  const params = useParams()
  const navigate = useNavigate()
  const initialCode = normalizeCode(params.code ?? '')

  const [code, setCode] = useState(initialCode)
  const [username, setUsername] = useState('')
  const [codeState, setCodeState] = useState<CodeState>('idle')
  const [preview, setPreview] = useState<BillDetails | null>(null)
  const [nameError, setNameError] = useState('')
  const [busy, setBusy] = useState(false)

  const alreadyJoined = code.length === 12 && loadSession(code) !== null

  const lookup = async (value: string) => {
    if (value.length !== 12) {
      setCodeState(value.length === 0 ? 'idle' : 'notfound')
      return null
    }
    setCodeState('checking')
    try {
      const bill = await api.getBill(value)
      setPreview(bill)
      setCodeState(isFinalized(bill) ? 'closed' : 'found')
      return bill
    } catch (error) {
      setPreview(null)
      setCodeState(error instanceof ApiError && error.kind === 'notfound' ? 'notfound' : 'failed')
      return null
    }
  }

  useEffect(() => {
    if (initialCode.length > 0) void lookup(initialCode)
    // yalnızca linkten gelen kod için ilk kontrol
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setNameError('')
    const name = username.trim()

    const bill = codeState === 'found' && preview?.code === code ? preview : await lookup(code)
    if (!bill || isFinalized(bill)) return
    if (!name) return setNameError('Masada sana bir isim lazım. Boş bırakma.')
    if (name.length > 50) return setNameError('Ad en fazla 50 karakter olabilir. Biraz kısalt.')

    setBusy(true)
    try {
      const session = await api.join(bill.code, name)
      saveSession(session)
      navigate(`/masa/${session.bill.code}`, { replace: true })
    } catch (error) {
      setBusy(false)
      if (error instanceof ApiError && error.kind === 'conflict') {
        // 409'un nedeni metinden okunmaz: masa durumuna bakılır.
        const fresh = await lookup(code)
        if (fresh && !isFinalized(fresh)) {
          setNameError(`Bu masada zaten bir “${name}” var. Başka bir ad seç.`)
        }
      } else if (error instanceof ApiError && error.kind === 'notfound') {
        setCodeState('notfound')
      } else if (error instanceof ApiError && error.kind === 'network') {
        setNameError('İnternet masadan kalktı. Bağlantını kontrol edip tekrar dene.')
      } else if (error instanceof ApiError && error.kind === 'invalid') {
        setNameError('Bu ad olmadı. Boş bırakma ve 50 karakteri geçme.')
      } else {
        setNameError('Masaya şu an oturamadık. Birkaç saniye sonra tekrar dene.')
      }
    }
  }

  if (alreadyJoined) return <Navigate to={`/masa/${code}`} replace />

  if (codeState === 'closed' && preview) {
    return (
      <main className="narrow">
        <BackLink to="/katil" />
        <div style={{ position: 'relative', margin: '48px auto 0', width: 250 }}>
          <div className="zz" style={{ background: 'var(--white)', padding: '22px 20px 30px', transform: 'rotate(-3deg)', filter: 'drop-shadow(4px 5px 0 var(--ink))' }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.14em', textAlign: 'center' }}>{preview.code}</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {[80, 60, 72, 50].map((w) => (
                <div key={w} style={{ height: 10, borderRadius: 5, background: 'var(--soft)', width: `${w}%` }} />
              ))}
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 62,
              border: '4px solid var(--danger)',
              color: 'var(--danger)',
              borderRadius: 12,
              padding: '6px 14px',
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: '0.04em',
              background: 'rgba(255,255,255,0.85)',
              transform: 'rotate(-14deg)',
            }}
          >
            KESİLDİ
          </div>
        </div>
        <h1 className="h1-sm" style={{ marginTop: 44 }}>Bu hesap kesilmiş.</h1>
        <p className="lead" style={{ marginTop: 12 }}>
          Host hesabı kapattığı için şu an yeni kimse katılamıyor. Host hesabı yeniden açarsa bu kodla tekrar deneyebilirsin.
        </p>
        <div className="spacer" style={{ minHeight: 24 }} />
        <div style={{ display: 'grid', gap: 12 }}>
          <button className="btn alt" type="button" onClick={() => void lookup(code)}>
            <Icon name="retry" />
            Tekrar dene
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setCode('')
              setPreview(null)
              setCodeState('idle')
            }}
          >
            Başka bir kod gir
          </button>
        </div>
      </main>
    )
  }

  const host = preview?.participants.find((p) => p.isHost)
  const codeError = codeState === 'notfound' || codeState === 'failed'

  return (
    <form className="narrow" onSubmit={submit} noValidate>
      <BackLink to="/" />
      <h1 className="h1" style={{ marginTop: 16 }}>Masaya otur.</h1>
      <p className="lead" style={{ marginTop: 10 }}>
        Davet linkine ya da QR’a dokunduysan kod kendiliğinden dolar; yoksa elle girebilirsin.
      </p>

      <label className="label" htmlFor="code">
        <span>Masa kodu</span>
      </label>
      <input
        id="code"
        className={`field code${codeError ? ' err' : ''}`}
        value={code}
        onChange={(e) => {
          const next = normalizeCode(e.target.value).slice(0, 12)
          setCode(next)
          setPreview(null)
          setCodeState('idle')
          if (next.length === 12) void lookup(next)
        }}
        maxLength={16}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={codeError ? true : undefined}
        aria-describedby="codeInfo"
      />
      <div id="codeInfo">
        {codeState === 'found' && host && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14, fontWeight: 600 }}>
            <span className="av" style={{ width: 22, height: 22, background: 'var(--lime)' }}>
              <Icon name="check" size={12} />
            </span>
            {possessive(host.username)} masası · {preview?.participants.length} kişi oturuyor
          </div>
        )}
        {codeState === 'checking' && (
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="spinner" size={16} spin />
            Masa aranıyor…
          </div>
        )}
        {codeState === 'notfound' && (
          <>
            <div className="errmsg" role="alert">
              <Icon name="warn" />
              <span>Bu kodla bir masa bulamadık. Bir harf kayıvermiş olabilir; hostun attığı kodla karşılaştır.</span>
            </div>
          </>
        )}
        {codeState === 'failed' && (
          <div className="errmsg" role="alert">
            <Icon name="warn" />
            <span>Masaya şu an ulaşamadık. Bağlantını kontrol edip tekrar dene.</span>
          </div>
        )}
      </div>

      <label className="label" htmlFor="guestName">
        <span>Adın</span>
      </label>
      <input
        id="guestName"
        className={`field${nameError ? ' err' : ''}`}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={60}
        autoComplete="nickname"
        aria-invalid={nameError ? true : undefined}
        aria-describedby={nameError ? 'nameErr' : undefined}
      />
      {nameError && (
        <div id="nameErr" className="errmsg" role="alert">
          <Icon name="warn" />
          <span>{nameError}</span>
        </div>
      )}
      {nameError && username.trim() && nameError.includes('zaten bir') && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[`${username.trim()} 2`, `${username.trim()} 3`, `${username.trim()}_`]
            .filter((option) => option.length <= 50)
            .map((option) => (
              <button
                key={option}
                type="button"
                className="chip"
                onClick={() => {
                  setUsername(option)
                  setNameError('')
                }}
              >
                {option}
              </button>
            ))}
        </div>
      )}

      <div className="spacer" style={{ minHeight: 24 }} />
      <button className="btn" type="submit" disabled={busy || code.length !== 12}>
        {busy ? (
          <>
            <Icon name="spinner" spin />
            Masaya oturuyorsun…
          </>
        ) : (
          <>
            Masaya otur
            <Icon name="right" />
          </>
        )}
      </button>
    </form>
  )
}
