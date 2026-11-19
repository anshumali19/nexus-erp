import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Truck, CheckCircle2, XCircle, FileText, PackageCheck, Pencil, Trash2 } from 'lucide-react';
import { useDB } from '../kit/db';
import { PageHeader, Button, DataTable, StatusBadge, Drawer, FormModal, Badge, Avatar, useToast, Card } from '../kit/ui';
import { money, money2, date } from '../kit/format';
import { OrderBuilder, LinesTable, SO_TONE, INV_TONE, byId } from './shared';
import { SO_STATUSES } from '../seed';

export function SalesOrders() {
  const { db, add, update, setDb } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const customers = byId(db.customers);
  const view = db.salesOrders.find((o) => o.id === viewId);

  useEffect(() => { if (params.get('new')) { setCreating(true); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line

  const create = ({ partyId, ...rest }) => {
    const n = Math.max(...db.salesOrders.map((o) => +o.number.split('-')[1]), 10400) + 1;
    add('salesOrders', { number: `SO-${n}`, customerId: partyId, status: 'Draft', invoiced: false, ...rest });
    setCreating(false);
    toast(`Sales order SO-${n} created`);
  };

  // Shipping deducts stock for every line — modules share the same data.
  const setStatus = (o, status) => {
    if (status === 'Shipped') {
      const short = o.lines.find((l) => (db.products.find((p) => p.id === l.productId)?.stock ?? 0) < l.qty);
      if (short) return toast(`Not enough stock for ${short.name}`, 'error');
      setDb((d) => ({
        ...d,
        products: d.products.map((p) => {
          const qty = o.lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.qty, 0);
          return qty ? { ...p, stock: p.stock - qty } : p;
        }),
        salesOrders: d.salesOrders.map((x) => (x.id === o.id ? { ...x, status } : x)),
      }));
      return toast(`${o.number} shipped — inventory updated`);
    }
    update('salesOrders', o.id, { status });
    toast(`${o.number} marked ${status.toLowerCase()}`);
  };

  const invoice = (o) => {
    const n = Math.max(...db.invoices.map((i) => +i.number.split('-')[1]), 30400) + 1;
    add('invoices', { number: `INV-${n}`, customerId: o.customerId, orderId: o.id, orderNumber: o.number, date: new Date().toISOString(), due: new Date(Date.now() + 30 * 864e5).toISOString(), amount: o.total, status: 'Unpaid', paidAt: null });
    update('salesOrders', o.id, { invoiced: true });
    toast(`Invoice INV-${n} issued for ${money(o.total)}`);
  };

  const rows = db.salesOrders.map((o) => ({ ...o, customer: customers[o.customerId]?.name || '—' }));

  return (
    <>
      <PageHeader title="Sales orders" subtitle="Quote-to-cash: create, confirm, ship and invoice customer orders." actions={<Button icon={Plus} onClick={() => setCreating(true)}>New order</Button>} />
      <DataTable
        rows={rows}
        exportName="sales-orders"
        searchKeys={['number', 'customer']}
        filter={{ key: 'status', options: SO_STATUSES }}
        initialSort={{ key: 'date', dir: 'desc' }}
        onRowClick={(r) => setViewId(r.id)}
        columns={[
          { key: 'number', label: 'Order', render: (r) => <span className="font-medium text-slate-900">{r.number}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'date', label: 'Date', render: (r) => date(r.date), sortValue: (r) => new Date(r.date).getTime(), csv: (r) => date(r.date) },
          { key: 'items', label: 'Items', render: (r) => r.lines.reduce((s, l) => s + l.qty, 0), sortValue: (r) => r.lines.length, csv: (r) => r.lines.length },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} map={SO_TONE} /> },
          { key: 'invoiced', label: 'Billing', render: (r) => (r.invoiced ? <Badge tone="green">Invoiced</Badge> : <Badge>Not billed</Badge>) },
          { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-medium">{money2(r.total)}</span> },
        ]}
      />
      <OrderBuilder open={creating} onClose={() => setCreating(false)} title="New sales order" parties={db.customers} partyLabel="Customer" products={db.products} priceField="price" taxRate={db.company.taxRate} onSave={create} />
      <Drawer
        open={!!view}
        onClose={() => setViewId(null)}
        title={view?.number}
        width="max-w-2xl"
        footer={
          view && (
            <div className="flex flex-wrap justify-end gap-2">
              {view.status === 'Draft' && <Button icon={CheckCircle2} onClick={() => setStatus(view, 'Confirmed')}>Confirm</Button>}
              {view.status === 'Confirmed' && <Button icon={Truck} onClick={() => setStatus(view, 'Shipped')}>Ship order</Button>}
              {view.status === 'Shipped' && <Button icon={PackageCheck} variant="success" onClick={() => setStatus(view, 'Delivered')}>Mark delivered</Button>}
              {['Confirmed', 'Shipped', 'Delivered'].includes(view.status) && !view.invoiced && <Button variant="secondary" icon={FileText} onClick={() => invoice(view)}>Create invoice</Button>}
              {['Draft', 'Confirmed'].includes(view.status) && <Button variant="secondary" icon={XCircle} onClick={() => setStatus(view, 'Cancelled')}>Cancel</Button>}
            </div>
          )
        }
      >
        {view && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={view.status} map={SO_TONE} />
              <span className="text-sm text-slate-500">{date(view.date)}</span>
            </div>
            <Timeline steps={['Draft', 'Confirmed', 'Shipped', 'Delivered']} current={view.status} />
            <Card className="flex items-center gap-3 p-4">
              <Avatar name={customers[view.customerId]?.name} size={40} />
              <div>
                <div className="font-medium text-slate-900">{customers[view.customerId]?.name}</div>
                <div className="text-xs text-slate-500">{customers[view.customerId]?.contact} · {customers[view.customerId]?.email}</div>
              </div>
            </Card>
            <LinesTable {...view} taxRate={db.company.taxRate} />
          </div>
        )}
      </Drawer>
    </>
  );
}

function Timeline({ steps, current }) {
  const idx = steps.indexOf(current);
  if (current === 'Cancelled') return <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">This order was cancelled.</div>;
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i <= idx ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
            <span className={`text-[11px] ${i <= idx ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`mx-1 mb-4 h-0.5 flex-1 ${i < idx ? 'bg-brand-600' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

const CUSTOMER_FIELDS = [
  { name: 'name', label: 'Company name', required: true },
  { name: 'contact', label: 'Contact person', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'city', label: 'City' },
  { name: 'segment', label: 'Segment', type: 'select', options: ['Enterprise', 'Mid-market', 'SMB'] },
  { name: 'creditLimit', label: 'Credit limit ($)', type: 'number' },
];

export function Customers() {
  const { db, add, update, remove } = useDB();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [viewId, setViewId] = useState(null);
  const view = db.customers.find((c) => c.id === viewId);

  const stats = (id) => {
    const orders = db.salesOrders.filter((o) => o.customerId === id && o.status !== 'Cancelled');
    const due = db.invoices.filter((i) => i.customerId === id && i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
    return { orders: orders.length, revenue: orders.reduce((s, o) => s + o.total, 0), due };
  };
  const rows = db.customers.map((c) => ({ ...c, ...stats(c.id) }));

  return (
    <>
      <PageHeader title="Customers" subtitle={`${db.customers.length} accounts`} actions={<Button icon={Plus} onClick={() => setEdit({})}>Add customer</Button>} />
      <DataTable
        rows={rows}
        exportName="customers"
        searchKeys={['name', 'contact', 'email', 'city']}
        filter={{ key: 'segment', options: ['Enterprise', 'Mid-market', 'SMB'] }}
        onRowClick={(r) => setViewId(r.id)}
        columns={[
          { key: 'name', label: 'Customer', render: (r) => (<div className="flex items-center gap-3"><Avatar name={r.name} /><div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.contact}</div></div></div>) },
          { key: 'city', label: 'City' },
          { key: 'segment', label: 'Segment', render: (r) => <Badge tone={r.segment === 'Enterprise' ? 'purple' : r.segment === 'SMB' ? 'gray' : 'blue'}>{r.segment}</Badge> },
          { key: 'orders', label: 'Orders', align: 'right' },
          { key: 'revenue', label: 'Lifetime value', align: 'right', render: (r) => money(r.revenue) },
          { key: 'due', label: 'Balance due', align: 'right', render: (r) => <span className={r.due > 0 ? 'font-medium text-amber-700' : 'text-slate-400'}>{money(r.due)}</span> },
        ]}
      />
      <FormModal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit customer' : 'New customer'}
        fields={CUSTOMER_FIELDS}
        initial={edit}
        onSubmit={(v) => { edit.id ? update('customers', edit.id, v) : add('customers', v); toast(edit.id ? 'Customer updated' : 'Customer added'); setEdit(null); }}
      />
      <Drawer
        open={!!view}
        onClose={() => setViewId(null)}
        title={view?.name}
        footer={view && (<>
          <Button variant="secondary" icon={Trash2} onClick={() => { if (confirm('Delete this customer?')) { remove('customers', view.id); setViewId(null); toast('Customer deleted'); } }}>Delete</Button>
          <Button icon={Pencil} onClick={() => { setEdit(view); setViewId(null); }}>Edit</Button>
        </>)}
      >
        {view && (() => {
          const s = stats(view.id);
          const orders = db.salesOrders.filter((o) => o.customerId === view.id).sort((a, b) => new Date(b.date) - new Date(a.date));
          const invs = db.invoices.filter((i) => i.customerId === view.id).slice(0, 6);
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Card className="p-3"><div className="text-lg font-semibold">{s.orders}</div><div className="text-xs text-slate-500">Orders</div></Card>
                <Card className="p-3"><div className="text-lg font-semibold">{money(s.revenue)}</div><div className="text-xs text-slate-500">Lifetime</div></Card>
                <Card className="p-3"><div className="text-lg font-semibold text-amber-600">{money(s.due)}</div><div className="text-xs text-slate-500">Due</div></Card>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[['Contact', view.contact], ['Email', view.email], ['Phone', view.phone], ['City', view.city], ['Segment', view.segment], ['Credit limit', money(view.creditLimit)]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800 break-all">{v}</dd></div>
                ))}
              </dl>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent orders</h4>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {orders.slice(0, 6).map((o) => (
                    <li key={o.id} className="flex items-center justify-between px-3 py-2 text-sm"><span className="font-medium">{o.number}</span><span className="text-slate-500">{date(o.date)}</span><StatusBadge status={o.status} map={SO_TONE} /><span>{money(o.total)}</span></li>
                  ))}
                  {orders.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">No orders yet</li>}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices</h4>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {invs.map((i) => (
                    <li key={i.id} className="flex items-center justify-between px-3 py-2 text-sm"><span className="font-medium">{i.number}</span><span className="text-slate-500">due {date(i.due)}</span><StatusBadge status={i.status} map={INV_TONE} /><span>{money(i.amount)}</span></li>
                  ))}
                  {invs.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">No invoices yet</li>}
                </ul>
              </div>
            </div>
          );
        })()}
      </Drawer>
    </>
  );
}
