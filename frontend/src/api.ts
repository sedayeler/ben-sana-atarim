// Backend sözleşmesi (BillsController / BillApiModels). Enum'lar backend'de sayı olarak serialize edilir.

export const BillStatus = { Active: 1, Finalized: 2 } as const
export const SplitType = { Quantity: 1, Shared: 2 } as const
export type SplitTypeValue = (typeof SplitType)[keyof typeof SplitType]

export interface Participant {
  id: string
  username: string
  isHost: boolean
  isReady: boolean
}

export interface BillItem {
  id: string
  billId: string
  name: string
  quantity: number
  unitPrice: number
  splitType: SplitTypeValue
}

export interface ItemSelection {
  id: string
  billItemId: string
  participantId: string
  quantity: number
}

export interface BillDetails {
  id: string
  code: string
  status: number
  serviceCharge: number
  createdAt: string
  participants: Participant[]
  items: BillItem[]
  selections: ItemSelection[]
}

export interface BillSession {
  accessToken: string
  participantId: string
  username: string
  bill: BillDetails
}

export interface ReceiptDraftItem {
  name: string
  quantity: number
  unitPrice: number
}

export interface ReceiptDraft {
  serviceCharge: number
  items: ReceiptDraftItem[]
}

export interface ParticipantCalculation {
  participantId: string
  username: string
  itemTotal: number
  serviceChargeShare: number
  total: number
}

export interface BillCalculation {
  billId: string
  itemsTotal: number
  serviceCharge: number
  total: number
  participants: ParticipantCalculation[]
}

export const isFinalized = (bill: BillDetails) => bill.status === BillStatus.Finalized

// Hata türleri HTTP durumundan türetilir; backend `detail` metinleri iş mantığı için kullanılmaz.
export type ApiErrorKind =
  | 'network'
  | 'auth'
  | 'forbidden'
  | 'notfound'
  | 'conflict'
  | 'invalid'
  | 'toolarge'
  | 'upstream'
  | 'ratelimit'
  | 'server'

export class ApiError extends Error {
  kind: ApiErrorKind
  status: number

  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notfound'
  if (status === 409) return 'conflict'
  if (status === 413) return 'toolarge'
  if (status === 429) return 'ratelimit'
  if (status === 502) return 'upstream'
  if (status >= 400 && status < 500) return 'invalid'
  return 'server'
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError('network', 0, 'Network error')
  }

  if (!response.ok) {
    let detail = ''
    try {
      const problem = (await response.json()) as { detail?: string }
      detail = problem.detail ?? ''
    } catch {
      // gövde yok ya da JSON değil
    }
    throw new ApiError(kindFromStatus(response.status), response.status, detail)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })
const bill = (id: string) => `/api/bills/${id}`

export const api = {
  createBill: (username: string) => request<BillSession>('/api/bills', { method: 'POST', ...json({ username }) }),
  getBill: (code: string) => request<BillDetails>(`${bill(encodeURIComponent(code))}`),
  join: (code: string, username: string) =>
    request<BillSession>(`${bill(encodeURIComponent(code))}/participants`, { method: 'POST', ...json({ username }) }),
  parseReceipt: (billId: string, image: File, token: string) => {
    const form = new FormData()
    form.append('image', image)
    return request<ReceiptDraft>(`${bill(billId)}/receipt/parse`, { method: 'POST', body: form }, token)
  },
  confirmReceipt: (billId: string, draft: ReceiptDraft, token: string) =>
    request<BillDetails>(`${bill(billId)}/receipt/confirm`, { method: 'POST', ...json(draft) }, token),
  selectItem: (billId: string, itemId: string, quantity: number, token: string) =>
    request<BillDetails>(`${bill(billId)}/items/${itemId}/selections`, { method: 'POST', ...json({ quantity }) }, token),
  changeQuantity: (billId: string, itemId: string, quantity: number, token: string) =>
    request<BillDetails>(`${bill(billId)}/items/${itemId}/selections`, { method: 'PUT', ...json({ quantity }) }, token),
  removeSelection: (billId: string, itemId: string, token: string) =>
    request<BillDetails>(`${bill(billId)}/items/${itemId}/selections`, { method: 'DELETE' }, token),
  changeSplitType: (billId: string, itemId: string, splitType: SplitTypeValue, token: string) =>
    request<BillDetails>(`${bill(billId)}/items/${itemId}/split-type`, { method: 'PUT', ...json({ splitType }) }, token),
  setReady: (billId: string, isReady: boolean, token: string) =>
    request<BillDetails>(`${bill(billId)}/participants/ready`, { method: 'PUT', ...json({ isReady }) }, token),
  finalize: (billId: string, token: string) => request<BillDetails>(`${bill(billId)}/finalize`, { method: 'POST' }, token),
  reopen: (billId: string, token: string) => request<BillDetails>(`${bill(billId)}/reopen`, { method: 'POST' }, token),
  calculate: (code: string) => request<BillCalculation>(`${bill(encodeURIComponent(code))}/calculation`),
}
