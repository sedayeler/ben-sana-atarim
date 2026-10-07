import { Link } from 'react-router-dom'
import { Brand, Icon } from '../ui'

export default function Landing() {
  return (
    <main className="narrow" style={{ paddingTop: 24 }}>
      <Brand />

      <div className="landing-receipt" aria-hidden="true">
        <div className="zz">
          <div className="mono" style={{ fontWeight: 500, letterSpacing: '0.14em', textAlign: 'center', marginBottom: 10 }}>
            ADİSYON · MASA 7
          </div>
          <div className="mono row"><span>2× mercimek</span><span>280,00</span></div>
          <div className="mono row"><span>3× köfte</span><span>1.260,00</span></div>
          <div className="mono row"><span>1× pizza</span><span>480,00</span></div>
          <div className="mono row"><span>4× ayran</span><span>240,00</span></div>
          <div className="mono row"><span>1× künefe</span><span>260,00</span></div>
          <div style={{ borderTop: '2px dashed var(--ink)', margin: '10px 0 8px' }} />
          <div className="mono row" style={{ fontWeight: 500 }}><span>TOPLAM</span><span>₺3.620</span></div>
        </div>
      </div>
      <div className="stamp-tag" aria-hidden="true">kuruşu kuruşuna</div>

      <h1 className="hero">
        HESAP
        <br />
        GELDİ.
        <br />
        <span className="outline">
          PANİK
          <br />
          YOK.
        </span>
      </h1>

      <div className="spacer" style={{ minHeight: 20 }} />
      <p className="lead" style={{ marginBottom: 18 }}>
        Fişi çek, QR'ı ortaya koy. Herkes kendi yediğini seçsin. Kim ne kadar ödeyecek anında belli.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        <Link className="btn" to="/masa-kur">
          Hesabı ben açarım
          <Icon name="right" />
        </Link>
        <Link className="btn alt" to="/katil">
          Kodum var, masaya katılıyorum
        </Link>
      </div>
    </main>
  )
}
