import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Button, Field, Select, Input, IconButton } from '../kit/ui';
import { money2, isoDay } from '../kit/format';
import { totals } from '../seed';

export const SO_TONE = { Draft: 'gray', Confirmed: 'blue', Shipped: 'purple', Delivered: 'green', Cancelled: 'red' };
export const PO_TONE = { Draft: 'gray', Ordered: 'blue', Received: 'green', Cancelled: 'red' };
export const INV_TONE = { Paid: 'green', Unpaid: 'yellow', Overdue: 'red' };
export const LEAVE_TONE = { Pending: 'yellow', Approved: 'green', Rejected: 'red' };

/** Builds a sales or purchase order with line items. */
export function OrderBuilder({ open, onClose, title, parties, partyLabel, products, priceField, taxRate, onSave }) {
  const [partyId, setPartyId] = useState('');
  const [date, setDate] = useState(isoDay(new Date()));
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (open) {
      setPartyId(parties[0]?.id || '');
      setDate(isoDay(new Date()));
      setLines([{ productId: products[0]?.id, qty: 1, price: products[0]?.[priceField] || 0 }]);
    }
  }, [open]); // eslint-disable-line

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const t = totals(lines.map((l) => ({ ...l, qty: Number(l.qty) || 0, price: Number(l.price) || 0 })), taxRate);

  const save = () => {
    const out = lines
      .filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => ({ productId: l.productId, name: products.find((p) => p.id === l.productId)?.name, qty: Number(l.qty), price: Number(l.price) }));
    if (!partyId || out.length === 0) return;
    onSave({ partyId, date: new Date(date + 'T12:00:00').toISOString(), lines: out, ...totals(out, taxRate) });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create order</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={partyLabel}>
          <Select value={partyId} onChange={(e) => setPartyId(e.target.value)} options={parties.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
        <Field label="Order date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Line items</div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <Select
                className="col-span-12 sm:col-span-6"
                value={l.productId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  setLine(i, { productId: p.id, price: p[priceField] });
                }}
                options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock} in stock)` }))}
              />
              <Input className="col-span-3 sm:col-span-2" type="number" min="1" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              <Input className="col-span-5 sm:col-span-2" type="number" step="0.01" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} />
              <div className="col-span-3 text-right text-sm font-medium sm:col-span-1">{money2((Number(l.qty) || 0) * (Number(l.price) || 0)).replace('.00', '')}</div>
              <IconButton className="col-span-1" icon={Trash2} title="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon={Plus} className="mt-2" onClick={() => setLines((ls) => [...ls, { productId: products[0].id, qty: 1, price: products[0][priceField] }])}>
          Add line
        </Button>
      </div>
      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 rounded-lg bg-slate-50 p-4 text-sm">
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money2(t.subtotal)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Tax ({taxRate}%)</span><span>{money2(t.tax)}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900"><span>Total</span><span>{money2(t.total)}</span></div>
      </div>
    </Modal>
  );
}

export function LinesTable({ lines, subtotal, tax, total, taxRate }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Price</th>
            <th className="px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="px-3 py-2">{l.name}</td>
              <td className="px-3 py-2 text-right">{l.qty}</td>
              <td className="px-3 py-2 text-right">{money2(l.price)}</td>
              <td className="px-3 py-2 text-right font-medium">{money2(l.qty * l.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50/60 text-sm">
          <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">Subtotal</td><td className="px-3 py-1.5 text-right">{money2(subtotal)}</td></tr>
          <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">Tax {taxRate ? `(${taxRate}%)` : ''}</td><td className="px-3 py-1.5 text-right">{money2(tax)}</td></tr>
          <tr><td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td><td className="px-3 py-2 text-right font-semibold">{money2(total)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

export const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
