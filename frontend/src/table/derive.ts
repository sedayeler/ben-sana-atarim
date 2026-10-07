import { SplitType, api, type BillCalculation, type BillDetails, type BillItem, type ItemSelection } from '../api'
import { useEffect, useMemo, useState } from 'react'

// Yalnızca ekranda ilerleme/filtre göstermek için kalem başına dağılım özeti.
// Tutar hesabı burada yapılmaz; kişi tutarlarının tek kaynağı backend'in calculation sonucudur.
export interface ItemView {
  item: BillItem
  selections: ItemSelection[]
  taken: number
  open: number
  complete: boolean
}

export function describeItems(bill: BillDetails): ItemView[] {
  return bill.items.map((item) => {
    const selections = bill.selections.filter((s) => s.billItemId === item.id)
    if (item.splitType === SplitType.Shared) {
      const taken = selections.length
      return { item, selections, taken, open: taken === 0 ? 1 : 0, complete: taken > 0 }
    }
    const taken = selections.reduce((total, s) => total + s.quantity, 0)
    return { item, selections, taken, open: Math.max(item.quantity - taken, 0), complete: taken === item.quantity }
  })
}

// Dağılım tamamsa backend'den güncel hesap sonucu istenir; tamamlanmamışsa tutar gösterilmez.
export function useCalculation(bill: BillDetails, distributed: boolean): BillCalculation | null {
  const [result, setResult] = useState<BillCalculation | null>(null)

  const signature = useMemo(
    () =>
      JSON.stringify([
        bill.serviceCharge,
        bill.participants.map((p) => p.id),
        bill.items.map((i) => [i.id, i.quantity, i.unitPrice, i.splitType]),
        bill.selections.map((s) => [s.billItemId, s.participantId, s.quantity]),
      ]),
    [bill],
  )

  useEffect(() => {
    if (!distributed) {
      setResult(null)
      return
    }
    let cancelled = false
    api
      .calculate(bill.code)
      .then((value) => {
        if (!cancelled) setResult(value)
      })
      .catch(() => {
        if (!cancelled) setResult(null)
      })
    return () => {
      cancelled = true
    }
    // signature, bill içeriği değiştiğinde yeniden hesap ister
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributed, signature, bill.code])

  return result
}
