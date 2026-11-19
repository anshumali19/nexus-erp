import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Send, PackageCheck, XCircle, Star, Pencil, Trash2 } from 'lucide-react';
import { useDB } from '../kit/db';
import { PageHeader, Button, DataTable, StatusBadge, Drawer, FormModal, Avatar, useToast, Card, Badge } from '../kit/ui';
import { money, money2, date } from '../kit/format';
import { OrderBuilder, LinesTable, PO_TONE, byId } from './shared';
import { PO_STATUSES } from '../seed';

export function PurchaseOrders() {
  const { db, add, update, setDb } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const suppliers = byId(db.suppliers);
  const view = db.purchaseOrders.find((o) => o.id === viewId);

  useEffect(() => { if (params.get('new')) { setCreating(true); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line

  const create = ({ partyId, ...rest }) => {
    const n = Math.max(...db.purchaseOrders.map((o) => +o.number.split('-')[1]), 20100) + 1;
    const sup = suppliers[partyId];
    add('purchaseOrders', { number: `PO-${n}`, supplierId: partyId, status: 'Draft', expected: new Date(Date.now() + (sup?.leadDays || 7) * 864e5).toISOString(), ...rest });
    setCreating(false);
    toast(`Purchase order PO-${n} created`);
  };

  // Receiving goods adds the quantities to stock.
  const receive = (o) => {
    setDb((d) => ({
      ...d,
      products: d.products.map((p) => {
        const qty = o.lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.qty, 0);
        return qty ? { ...p, stock: p.stock + qty } : p;
      }),
      purchaseOrders: d.purchaseOrders.map((x) => (x.id === o.id ? { ...x, status: 'Received', receivedAt: new Date().toISOString() } : x)),
    }));
    toast(`${o.number} received — stock levels increased`);
  };

  const rows = db.purchaseOrders.map((o) => ({ ...o, supplier: suppliers[o.supplierId]?.name || '—' }));
  const open = db.purchaseOrders.filter((o) => o.status === 'Ordered');

  return (
    <>
      <PageHeader title="Purchase orders" subtitle="Procure-to-pay: order from suppliers and receive goods into inventory." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New purchase order</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Awaiting delivery</div><div className="mt-1 text-xl font-semibold">{open.length} orders</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Committed spend</div><div className="mt-1 text-xl font-semibold">{money(open.reduce((s, o) => s + o.total, 0))}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Drafts to send</div><div className="mt-1 text-xl font-semibold">{db.purchaseOrders.filter((o) => o.status === 'Draft').length}</div></Card>
      </div>
      <DataTable
        rows={rows}
        exportName="purchase-orders"
        searchKeys={['number', 'supplier']}
        filter={{ key: 'status', options: PO_STATUSES }}
        initialSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => setViewId(r.id)}
        columns={[
          { key: 'number', label: 'PO', render: (r) => <span className="font-medium text-slate-900">{r.number}</span> },
          { key: 'supplier', label: 'Supplier' },
          { key: 'date', label: 'Ordered', render: (r) => date(r.date), sortValue: (r) => new Date(r.date).getTime(), csv: (r) => date(r.date) },
          { key: 'expected', label: 'Expected', render: (r) => date(r.expected), sortValue: (r) => new Date(r.expected).getTime(), csv: (r) => date(r.expected) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} map={PO_TONE} /> },
          { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-medium">{money2(r.total)}</span> },
        ]}
      />
      <OrderBuilder open={creating} onClose={() => setCreating(false)} title="New purchase order" parties={db.suppliers} partyLabel="Supplier" products={db.products} priceField="cost" taxRate={db.company.taxRate} onSave={create} />
      <Drawer
        open={!!view}
        onClose={() => setViewId(null)}
        title={view?.number}
        width="max-w-2xl"
        footer={view && (
          <>
            {view.status === 'Draft' && <Button icon={Send} onClick={() => { update('purchaseOrders', view.id, { status: 'Ordered' }); toast(`${view.number} sent to supplier`); }}>Send to supplier</Button>}
            {view.status === 'Ordered' && <Button icon={PackageCheck} variant="success" onClick={() => receive(view)}>Receive goods</Button>}
            {['Draft', 'Ordered'].includes(view.status) && <Button variant="secondary" icon={XCircle} onClick={() => { update('purchaseOrders', view.id, { status: 'Cancelled' }); toast('PO cancelled'); }}>Cancel</Button>}
          </>
        )}
      >
        {view && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={view.status} map={PO_TONE} />
              <span className="text-sm text-slate-500">Ordered {date(view.date)} · Expected {date(view.expected)}</span>
            </div>
            <Card className="flex items-center gap-3 p-4">
              <Avatar name={suppliers[view.supplierId]?.name} size={40} />
              <div>
                <div className="font-medium text-slate-900">{suppliers[view.supplierId]?.name}</div>
                <div className="text-xs text-slate-500">{suppliers[view.supplierId]?.contact} · lead time {suppliers[view.supplierId]?.leadDays} days</div>
              </div>
            </Card>
            <LinesTable {...view} taxRate={db.company.taxRate} />
          </div>
        )}
      </Drawer>
    </>
  );
}

const SUPPLIER_FIELDS = [
  { name: 'name', label: 'Supplier name', required: true },
  { name: 'contact', label: 'Contact person' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'city', label: 'City' },
  { name: 'category', label: 'Category', type: 'select', options: ['Electronics', 'Furniture', 'Supplies', 'Networking'] },
  { name: 'leadDays', label: 'Lead time (days)', type: 'number' },
  { name: 'rating', label: 'Rating (1-5)', type: 'number', min: 1 },
];

export function Suppliers() {
  const { db, add, update, remove } = useDB();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const spend = (id) => db.purchaseOrders.filter((p) => p.supplierId === id && p.status === 'Received').reduce((s, p) => s + p.total, 0);
  const rows = db.suppliers.map((s) => ({ ...s, spend: spend(s.id), pos: db.purchaseOrders.filter((p) => p.supplierId === s.id).length }));
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Vendors, lead times and spend." actions={<Button icon={Plus} onClick={() => setEdit({})}>Add supplier</Button>} />
      <DataTable
        rows={rows}
        exportName="suppliers"
        searchKeys={['name', 'contact', 'city', 'category']}
        filter={{ key: 'category', options: ['Electronics', 'Furniture', 'Supplies', 'Networking'] }}
        columns={[
          { key: 'name', label: 'Supplier', render: (r) => (<div className="flex items-center gap-3"><Avatar name={r.name} /><div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.email}</div></div></div>) },
          { key: 'category', label: 'Category', render: (r) => <Badge>{r.category}</Badge> },
          { key: 'city', label: 'City' },
          { key: 'leadDays', label: 'Lead time', render: (r) => `${r.leadDays} days` },
          { key: 'rating', label: 'Rating', render: (r) => <span className="flex text-amber-400">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < r.rating ? 'currentColor' : 'none'} />)}</span> },
          { key: 'pos', label: 'POs', align: 'right' },
          { key: 'spend', label: 'Spend', align: 'right', render: (r) => money(r.spend) },
          { key: 'actions', label: '', sortable: false, render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setEdit(r)} />
              <Button size="xs" variant="ghost" icon={Trash2} onClick={() => { if (confirm('Delete supplier?')) { remove('suppliers', r.id); toast('Supplier deleted'); } }} />
            </div>
          ) },
        ]}
      />
      <FormModal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit supplier' : 'New supplier'}
        fields={SUPPLIER_FIELDS}
        initial={edit}
        onSubmit={(v) => { const { spend: _s, pos: _p, ...clean } = v; edit.id ? update('suppliers', edit.id, clean) : add('suppliers', clean); toast('Supplier saved'); setEdit(null); }}
      />
    </>
  );
}
