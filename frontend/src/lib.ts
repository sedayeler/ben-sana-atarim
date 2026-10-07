import type { BillDetails, BillSession } from './api'

// ---- Katılımcı erişim oturumu (cihazda, masa koduna göre) ----

export interface StoredSession {
  accessToken: string
  participantId: string
  username: string
  billId: string
}

const key = (code: string) => `bsa:session:${code.toUpperCase()}`

export function loadSession(code: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(key(code))
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export function saveSession(session: BillSession) {
  const stored: StoredSession = {
    accessToken: session.accessToken,
    participantId: session.participantId,
    username: session.username,
    billId: session.bill.id,
  }
  try {
    localStorage.setItem(key(session.bill.code), JSON.stringify(stored))
  } catch {
    // depolama kapalıysa oturum yalnızca bu sekmede yaşar
  }
}

export function clearSession(code: string) {
  try {
    localStorage.removeItem(key(code))
  } catch {
    // yoksay
  }
}

// ---- Gösterim yardımcıları ----

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })
export const formatMoney = (value: number) => money.format(value)

// Backend decimal(10,2) sınırı.
export const MAX_MONEY = 99_999_999.99

// Hem Türkçe ("1.234,50", "95,50") hem noktalı ("95.50") yazımı kabul eder. Geçersiz ya da 2'den fazla ondalıklı girişte NaN döner.
// Virgül varsa ondalık ayracıdır, noktalar binliktir. Virgül yoksa "1.250" / "1.234.567" binlik, "95.50" / "12.5" ondalıktır.
export function parseMoney(text: string): number {
  const value = text.replace(/\s/g, '')
  if (value === '') return 0
  if (!/^-?[\d.,]+$/.test(value)) return NaN

  let normalized: string
  if (value.includes(',')) {
    const [whole, fraction, ...rest] = value.split(',')
    if (rest.length > 0 || fraction.includes('.')) return NaN
    normalized = `${whole.replace(/\./g, '')}.${fraction}`
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) {
    normalized = value.replace(/\./g, '')
  } else if (value.split('.').length > 2) {
    return NaN
  } else {
    normalized = value
  }

  if ((normalized.split('.')[1] ?? '').length > 2) return NaN
  const result = Number(normalized)
  return Number.isFinite(result) ? result : NaN
}

export const formatInput = (value: number) => value.toFixed(2).replace('.', ',')

export const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

export const inviteUrl = (code: string) => `${window.location.origin}/katil/${code}`

const AVATAR_COLORS = ['#FFD23F', '#FFB3D1', '#8FD3FF', '#CDEB4B', '#B9A6FF', '#FFC4A3', '#A8E6CF']

export function avatarColor(bill: BillDetails, participantId: string) {
  const index = bill.participants.findIndex((p) => p.id === participantId)
  return AVATAR_COLORS[(index < 0 ? 0 : index) % AVATAR_COLORS.length]
}

export const initial = (name: string) => (name.trim()[0] ?? '?').toLocaleUpperCase('tr-TR')

// Türkçe iyelik eki: ünlü uyumu (ın/in/un/ün) ve ünlüyle biten adlarda kaynaştırma harfi (nın/nin/nun/nün).
// Örnek: Seda → Seda’nın, Mahmut → Mahmut’un, Elif → Elif’in, Ece → Ece’nin, Ömer → Ömer’in.
export function possessive(name: string): string {
  const clean = name.trim()
  const letters = [...clean.toLocaleLowerCase('tr-TR')].filter((c) => /\p{L}/u.test(c))
  const vowels = 'aeıioöuü'
  const lastVowel = [...letters].reverse().find((c) => vowels.includes(c))
  if (!lastVowel) return `${clean}’in`
  const harmony = 'aı'.includes(lastVowel) ? 'ı' : 'ei'.includes(lastVowel) ? 'i' : 'ou'.includes(lastVowel) ? 'u' : 'ü'
  const endsWithVowel = vowels.includes(letters[letters.length - 1])
  return `${clean}’${endsWithVowel ? 'n' : ''}${harmony}n`
}
