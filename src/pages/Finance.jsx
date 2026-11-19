import { useMemo, useState } from 'react';
import { Plus, CheckCircle2, Pencil, Trash2, Printer, TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { useDB } from '../kit/db';
import { PageHeader, Button, DataTable, StatusBadge, FormModal, Modal, Card, CardHeader, StatCard, Badge, useToast } from '../kit/ui';
import { money, money2, date, compact, lastMonths } from '../kit/format';
import { INV_TONE, byId, LinesTable } from './shared';
import { EXPENSE_CATS } from '../seed';

export function Invoices() {
  const { db, update } = useDB();
  const toast = useToast();
  const [view, setView] = useState(null);
  const customers = byId(db.customers);
  const orders = byId(db.salesOrders);
  const rows = db.invoices.map((i) => ({ ...i, customer: customers[i.customerId]?.name || '—' }));
  const sum = (s) => db.invoices.filter((i) => i.status === s).reduce((a, i) => a + i.amount, 0);

  const aging = useMemo(() => {
    const b = { 'Current': 0, '1–30 days': 0, '31–60 days': 0, '60+ days': 0 };
    db.invoices.filter((i) => i.status !== 'Paid').forEach((i) => {
      const d = (Date.now() - new Date(i.due)) / 864e5;
      if (d <= 0) b['Current'] += i.amount; else if (d <= 30) b['1–30 days'] += i.amount; else if (d <= 60) b['31–60 days'] += i.amount; else b['60+ days'] += i.amount;
    });
    return b;
  }, [db.invoices]);

  return (
    <>
      <PageHeader title="Invoices" subtitle="Accounts receivable — track what customers owe and record payments." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid" value={money(sum('Paid'))} tone="green" icon={CheckCircle2} />
        <StatCard label="Outstanding" value={money(sum('Unpaid'))} tone="yellow" icon={Wallet} />
        <StatCard label="Overdue" value={money(sum('Overdue'))} tone="red" icon={TrendingDown} />
      </div>
      <Card className="mb-6 p-5">
        <div className="mb-3 text-sm font-semibold">Receivables aging</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(aging).map(([k, v], i) => (
            <div key={k} className="rounded-lg border border-slate-100 p-3">
              <div className="text-xs text-slate-500">{k}</div>
              <div className={`mt-1 text-lg font-semibold ${i >= 2 ? 'text-rose-600' : i === 1 ? 'text-amber-600' : 'text-slate-900'}`}>{money(v)}</div>
            </div>
          ))}
        </div>
      </Card>
      <DataTable
        rows={rows}
        exportName="invoices"
        searchKeys={['number', 'customer', 'orderNumber']}
        filter={{ key: 'status', options: ['Paid', 'Unpaid', 'Overdue'] }}
        initialSort={{ key: 'date', dir: 'desc' }}
        onRowClick={setView}
        columns={[
          { key: 'number', label: 'Invoice', render: (r) => <span className="font-medium text-slate-900">{r.number}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'orderNumber', label: 'Order', render: (r) => <span className="text-slate-500">{r.orderNumber}</span> },
          { key: 'date', label: 'Issued', render: (r) => date(r.date), sortValue: (r) => new Date(r.date).getTime(), csv: (r) => date(r.date) },
          { key: 'due', label: 'Due', render: (r) => date(r.due), sortValue: (r) => new Date(r.due).getTime(), csv: (r) => date(r.due) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} map={INV_TONE} /> },
          { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-medium">{money2(r.amount)}</span> },
          { key: 'act', label: '', sortable: false, render: (r) => r.status !== 'Paid' && (
            <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); update('invoices', r.id, { status: 'Paid', paidAt: new Date().toISOString() }); toast(`Payment recorded for ${r.number}`); }}>Record payment</Button>
          ) },
        ]}
      />
      <Modal open={!!view} onClose={() => setView(null)} title={`Invoice ${view?.number || ''}`} size="lg" footer={<><Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button><Button onClick={() => setView(null)}>Close</Button></>}>
        {view && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <div className="text-lg font-semibold">{db.company.name}</div>
                <div className="text-sm text-slate-500">{db.company.address}<br />{db.company.email}</div>
              </div>
              <div className="text-sm sm:text-right">
                <StatusBadge status={view.status} map={INV_TONE} />
                <div className="mt-2 text-slate-500">Issued {date(view.date)}</div>
                <div className="text-slate-500">Due {date(view.due)}</div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Bill to</div>
              <div className="mt-1 font-medium">{customers[view.customerId]?.name}</div>
              <div className="text-slate-500">{customers[view.customerId]?.contact} · {customers[view.customerId]?.city}</div>
            </div>
            {orders[view.orderId] ? <LinesTable {...orders[view.orderId]} taxRate={db.company.taxRate} /> : <div className="text-right text-xl font-semibold">{money2(view.amount)}</div>}
          </div>
        )}
      </Modal>
    </>
  );
}

const EXP_FIELDS = [
  { name: 'description', label: 'Description', required: true, span: 2 },
  { name: 'category', label: 'Category', type: 'select', options: EXPENSE_CATS },
  { name: 'vendor', label: 'Vendor' },
  { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
  { name: 'date', label: 'Date', type: 'date', required: true },
];

export function Expenses() {
  const { db, add, update, remove } = useDB();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const thisMonth = db.expenses.filter((e) => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear());
  const byCat = EXPENSE_CATS.map((c) => ({ name: c, value: db.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.value);
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#64748b'];
  return (
    <>
      <PageHeader title="Expenses" subtitle="Operating costs by category." actions={<Button icon={Plus} onClick={() => setEdit({ date: new Date().toISOString() })}>Add expense</Button>} />
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="grid gap-4">
          <StatCard label="This month" value={money(thisMonth.reduce((s, e) => s + e.amount, 0))} hint={`${thisMonth.length} entries`} icon={Wallet} />
          <StatCard label="Last 12 months" value={money(db.expenses.reduce((s, e) => s + e.amount, 0))} icon={TrendingUp} tone="purple" />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="Spend by category" />
          <div className="flex h-56 items-center">
            <ResponsiveContainer width="50%">
              <PieChart><Pie data={byCat} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip formatter={(v) => money(v)} /></PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 pr-6 text-sm">
              {byCat.map((c, i) => <div key={c.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} /><span className="flex-1 text-slate-600">{c.name}</span><span className="font-medium">{money(c.value)}</span></div>)}
            </div>
          </div>
        </Card>
      </div>
      <DataTable
        rows={db.expenses}
        exportName="expenses"
        searchKeys={['description', 'vendor', 'category']}
        filter={{ key: 'category', options: EXPENSE_CATS }}
        initialSort={{ key: 'date', dir: 'desc' }}
        columns={[
          { key: 'date', label: 'Date', render: (r) => date(r.date), sortValue: (r) => new Date(r.date).getTime(), csv: (r) => date(r.date) },
          { key: 'description', label: 'Description', render: (r) => <span className="font-medium text-slate-900">{r.description}</span> },
          { key: 'category', label: 'Category', render: (r) => <Badge>{r.category}</Badge> },
          { key: 'vendor', label: 'Vendor' },
          { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-medium">{money2(r.amount)}</span> },
          { key: 'act', label: '', sortable: false, render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setEdit(r)} />
              <Button size="xs" variant="ghost" icon={Trash2} onClick={() => { remove('expenses', r.id); toast('Expense deleted'); }} />
            </div>
          ) },
        ]}
      />
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit expense' : 'New expense'} fields={EXP_FIELDS} initial={edit}
        onSubmit={(v) => { edit.id ? update('expenses', edit.id, v) : add('expenses', v); toast('Expense saved'); setEdit(null); }} />
    </>
  );
}

export function Reports() {
  const { db } = useDB();
  const data = useMemo(() => {
    const months = lastMonths(12).map((m) => ({ ...m, revenue: 0, cogs: 0, opex: 0, payroll: 0 }));
    const idx = (d) => months.findIndex((m) => m.year === new Date(d).getFullYear() && m.month === new Date(d).getMonth());
    const prod = byId(db.products);
    db.salesOrders.filter((o) => !['Cancelled', 'Draft'].includes(o.status)).forEach((o) => {
      const i = idx(o.date);
      if (i < 0) return;
      months[i].revenue += o.subtotal;
      months[i].cogs += o.lines.reduce((s, l) => s + l.qty * (prod[l.productId]?.cost || l.price * 0.6), 0);
    });
    db.expenses.forEach((e) => { const i = idx(e.date); if (i >= 0) months[i].opex += e.amount; });
    db.payrollRuns.forEach((p) => { const i = idx(p.date); if (i >= 0) months[i].payroll += p.gross; });
    months.forEach((m) => { m.gross = m.revenue - m.cogs; m.net = m.gross - m.opex - m.payroll; });
    const T = months.reduce((a, m) => ({ revenue: a.revenue + m.revenue, cogs: a.cogs + m.cogs, opex: a.opex + m.opex, payroll: a.payroll + m.payroll }), { revenue: 0, cogs: 0, opex: 0, payroll: 0 });
    T.gross = T.revenue - T.cogs; T.net = T.gross - T.opex - T.payroll;
    return { months, T };
  }, [db]);
  const { months, T } = data;
  const row = (label, v, strong, neg) => (
    <div className={`flex justify-between px-5 py-2.5 text-sm ${strong ? 'bg-slate-50 font-semibold' : ''}`}>
      <span className={strong ? 'text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={neg ? 'text-rose-600' : ''}>{neg ? `(${money(v)})` : money(v)}</span>
    </div>
  );
  return (
    <>
      <PageHeader title="Financial reports" subtitle="Profit & loss for the trailing twelve months." actions={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (TTM)" value={money(T.revenue)} icon={TrendingUp} />
        <StatCard label="Gross profit" value={money(T.gross)} icon={Wallet} tone="green" hint={`${((T.gross / T.revenue) * 100 || 0).toFixed(1)}% gross margin`} />
        <StatCard label="Net profit" value={money(T.net)} icon={T.net >= 0 ? TrendingUp : TrendingDown} tone={T.net >= 0 ? 'green' : 'red'} />
        <StatCard label="Net margin" value={`${((T.net / T.revenue) * 100 || 0).toFixed(1)}%`} icon={Percent} tone="purple" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly profit & loss" />
          <div className="h-80 p-4">
            <ResponsiveContainer>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => '$' + compact(v)} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gross" name="Gross profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Income statement" subtitle="Trailing 12 months" />
          <div className="divide-y divide-slate-100">
            {row('Revenue', T.revenue)}
            {row('Cost of goods sold', T.cogs, false, true)}
            {row('Gross profit', T.gross, true)}
            {row('Operating expenses', T.opex, false, true)}
            {row('Payroll', T.payroll, false, true)}
            {row('Net profit', T.net, true)}
          </div>
        </Card>
      </div>
    </>
  );
}
