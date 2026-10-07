import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { saveSession } from '../lib'
import { BackLink, Icon } from '../ui'

export default function Create() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const name = username.trim()
    if (!name) return setError('Masada sana bir isim lazım. Boş bırakma.')
    if (name.length > 50) return setError('Ad en fazla 50 karakter olabilir. Biraz kısalt.')

    setBusy(true)
    setError('')
    try {
      const session = await api.createBill(name)
      saveSession(session)
      navigate(`/masa/${session.bill.code}`, { replace: true })
    } catch (e) {
      setError(
        e instanceof ApiError && e.kind === 'network'
          ? 'İnternet masadan kalktı. Bağlantını kontrol edip tekrar dene.'
          : 'Masayı şu an kuramadık. Birkaç saniye sonra tekrar dene.',
      )
      setBusy(false)
    }
  }

  return (
    <form className="narrow" onSubmit={submit} noValidate>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackLink to="/" />
        <span className="mono" style={{ fontSize: 13, letterSpacing: '0.12em' }}>ADIM 1 / 2</span>
        <span style={{ width: 44 }} />
      </div>

      <span className="pill" style={{ alignSelf: 'flex-start', marginTop: 40, transform: 'rotate(-2deg)' }}>
        <Icon name="crown" size={16} />
        Masa senden sorulur
      </span>
      <h1 className="h1" style={{ marginTop: 16 }}>
        Hesabı açalım.
        <br />
        Adın ne?
      </h1>
      <p className="lead" style={{ marginTop: 12 }}>
        Masadakiler seni bu adla görecek. Hesabın oluşturulduğunda sana bir davet kodu vereceğiz.
      </p>

      <label className="label" htmlFor="hostName">
        <span>Adın</span>
      </label>
      <input
        id="hostName"
        className={`field${error ? ' err' : ''}`}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={60}
        autoComplete="nickname"
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'hostErr' : undefined}
      />
      {error && (
        <div id="hostErr" className="errmsg" role="alert">
          <Icon name="warn" />
          <span>{error}</span>
        </div>
      )}

      <div className="note" style={{ marginTop: 28 }}>
        <Icon name="lock" size={22} />
        <div>
          <b style={{ color: 'var(--ink)' }}>Üyelik yok.</b> Bu masadaki yerin bu cihazda saklanır; sekmeyi kapatsan da geri döndüğünde seni tanırız.
        </div>
      </div>

      <div className="spacer" style={{ minHeight: 24 }} />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? (
          <>
            <Icon name="spinner" spin />
            Masa kuruluyor…
          </>
        ) : (
          <>
            Masayı kur
            <Icon name="right" />
          </>
        )}
      </button>
    </form>
  )
}
