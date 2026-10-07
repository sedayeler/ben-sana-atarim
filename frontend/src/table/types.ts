import type { BillDetails, Participant } from '../api'
import type { Connection } from '../useBill'

export interface ActOptions {
  // Çakışma (409) durumunda genel toast yerine çağıran ekran kendi mesajını gösterecekse true.
  quietConflict?: boolean
}

export interface TableCtx {
  bill: BillDetails
  me: Participant
  isHost: boolean
  token: string
  busy: boolean
  connection: Connection
  // Bir mutasyonu çalıştırır; başarıda snapshot'ı günceller, hatada genel (iş kuralı metnine bağlı olmayan) mesaj gösterir.
  act: (fn: (token: string) => Promise<BillDetails>, options?: ActOptions) => Promise<boolean>
}
