import { useState } from 'react'
import { api, type ReceiptDraft } from '../api'
import { MAX_MONEY, formatInput, formatMoney, parseMoney } from '../lib'
import { Icon } from '../ui'
import type { TableCtx } from './types'

interface Row {
  name: string
  quantity: string
  unitPrice: string
}

export default function Review({
  ctx,
  draft,
  onRescan,
  onBack,
  onDone,
}: {
  ctx: TableCtx
  draft: ReceiptDraft
  onRescan: () => void
  onBack: () => void
  onDone: () => void
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    draft.items.map((item) => ({ name: item.name, quantity: String(item.quantity), unitPrice: formatInput(item.unitPrice) })),
  )
  const [service, setService] = useState(formatInput(draft.serviceCharge))
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [serviceError, setServiceError] = useState('')
  const hasSelections = ctx.bill.items.length > 0

  const update = (index: number, patch: Partial<Row>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    // Düzeltilen satırın eski hata mesajı kalmasın.
    setErrors((current) => {
      if (!(index in current)) return current
      const next = { ...current }
      delete next[index]
      return next
    })
  }

  const validate = () => {
    const next: Record<number, string> = {}
    rows.forEach((row, index) => {
      const quantity = Number(row.quantity)
      const price = parseMoney(row.unitPrice)
      if (!row.name.trim()) next[index] = 'Kalem adı boş olamaz.'
      else if (row.name.trim().length > 150) next[index] = 'Kalem adı en fazla 150 karakter olabilir.'
      else if (!Number.isInteger(quantity) || quantity <= 0) next[index] = 'Adet 0’dan büyük bir sayı olmalı. Fişte kaç yazıyor?'
      else if (Number.isNaN(price)) next[index] = 'Fiyatı rakamla yaz, en fazla iki kuruş basamağıyla. Örnek: 95,50'
      else if (price < 0) next[index] = 'Fiyat negatif olamaz. Eksi işaretini sil.'
      else if (price > MAX_MONEY) next[index] = 'Bu fiyat çok büyük. Fişte ne yazıyorsa onu yaz.'
    })
    const serviceValue = parseMoney(service)
    const sError = Number.isNaN(serviceValue)
      ? 'Servis ücretini rakamla yaz, en fazla iki kuruş basamağıyla. Örnek: 75,50'
      : serviceValue < 0
        ? 'Servis ücreti negatif olamaz.'
        : serviceValue > MAX_MONEY
          ? 'Bu servis ücreti çok büyük. Fişte ne yazıyorsa onu yaz.'
          : ''
    setErrors(next)
    setServiceError(sError)
    return Object.keys(next).length === 0 && !sError
  }

  const errorCount = Object.keys(errors).length + (serviceError ? 1 : 0)

  const confirm = async () => {
    if (!validate()) return
    const payload: ReceiptDraft = {
      serviceCharge: parseMoney(service),
      items: rows.map((row) => ({ name: row.name.trim(), quantity: Number(row.quantity), unitPrice: parseMoney(row.unitPrice) })),
    }
    const ok = await ctx.act((token) => api.confirmReceipt(ctx.bill.id, payload, token))
    if (ok) onDone()
  }

  const sum = rows.reduce((total, row) => {
    const quantity = Number(row.quantity)
    const price = parseMoney(row.unitPrice)
    return Number.isFinite(quantity) && Number.isFinite(price) ? total + quantity * price : total
  }, 0)
  const serviceValue = parseMoney(service)

  return (
    <main className="review">
      <div className="review-head">
        <button type="button" className="ib" onClick={onBack} aria-label="Geri">
          <Icon name="left" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Doğru okumuş muyuz?</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>{rows.length} kalem · yanlış okunanı düzelt</div>
        </div>
        <button type="button" className="ib" onClick={onRescan} aria-label="Yeniden okut">
          <Icon name="retry" />
        </button>
      </div>

      <div className="review-list">
        <div className="note" style={{ background: 'var(--lavender)', borderStyle: 'solid' }}>
          <Icon name="circles" />
          <span>
            Birden fazla adedi olan kalemler <b>adetli</b>, diğerleri <b>paylaşımlı</b> başlar. Sonra masada host olarak değiştirebilirsin.
          </span>
        </div>

        {hasSelections && (
          <div className="note" style={{ borderColor: 'var(--danger)' }}>
            <Icon name="warn" />
            <span>
              Yeniden onaylarsan <b>herkesin seçimi sıfırlanır</b> ve hazır olanlar beklemeye döner.
            </span>
          </div>
        )}

        {rows.map((row, index) => (
          <div key={index} className={`rit${errors[index] ? ' err' : ''}`}>
            <input
              className="nm"
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
              aria-label={`Kalem ${index + 1} adı`}
              aria-invalid={errors[index] ? true : undefined}
            />
            <div className="nums">
              <input
                className="mini-in"
                style={{ width: 52 }}
                inputMode="numeric"
                value={row.quantity}
                onChange={(e) => update(index, { quantity: e.target.value })}
                aria-label={`Kalem ${index + 1} adet`}
              />
              <span className="mono" style={{ fontSize: 14 }}>×</span>
              <input
                className="mini-in"
                style={{ width: 96 }}
                inputMode="decimal"
                value={row.unitPrice}
                onChange={(e) => update(index, { unitPrice: e.target.value })}
                aria-label={`Kalem ${index + 1} birim fiyat`}
              />
            </div>
            {errors[index] && (
              <div className="errmsg" style={{ marginTop: 8, fontSize: 14 }} role="alert">
                <Icon name="warn" size={16} />
                {errors[index]}
              </div>
            )}
          </div>
        ))}

        <div className="rit" style={{ background: 'var(--sun)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="svc" style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>
              Servis ücreti
              <br />
              <span style={{ fontWeight: 500, fontSize: 13 }}>Fişteki tutarı yaz</span>
            </label>
            <input
              id="svc"
              className="mini-in"
              style={{ width: 110, background: 'var(--white)' }}
              inputMode="decimal"
              value={service}
              onChange={(e) => {
                setService(e.target.value)
                setServiceError('')
              }}
              aria-invalid={serviceError ? true : undefined}
            />
          </div>
          {serviceError && (
            <div className="errmsg" style={{ marginTop: 8, fontSize: 14 }} role="alert">
              <Icon name="warn" size={16} />
              {serviceError}
            </div>
          )}
        </div>
      </div>

      <div className="review-foot">
        <div className="sumrow">
          <span style={{ fontWeight: 700, fontSize: 16 }}>Toplam</span>
          <span className="mono" style={{ fontWeight: 500, fontSize: 24 }}>{formatMoney(sum)}</span>
        </div>
        {!Number.isNaN(serviceValue) && serviceValue > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: -6, marginBottom: 10 }}>+ {formatMoney(serviceValue)} servis ücreti</div>
        )}
        <button className="btn" type="button" onClick={() => void confirm()} disabled={ctx.busy}>
          {ctx.busy ? (
            <>
              <Icon name="spinner" spin />
              Kaydediliyor…
            </>
          ) : errorCount > 0 ? (
            `${errorCount} hatayı düzelt, sonra onayla`
          ) : (
            'Doğru, masaya aç'
          )}
        </button>
      </div>
    </main>
  )
}
