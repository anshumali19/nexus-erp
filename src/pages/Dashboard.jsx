import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, FileWarning, ShoppingCart, Package, AlertTriangle, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useDB } from '../kit/db';
import { Card, CardHeader, StatCard, PageHeader, StatusBadge, Badge, Button } from '../kit/ui';
import { money, compact, date, lastMonths } from '../kit/format';
import { SO_TONE, byId } from './shared';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

export default function Dashboard() {
  const { db } = useDB();
  const customers = byId(db.customers);
  const products = byId(db.products);

  const stats = useMemo(() => {
    const now = Date.now();
    const live = db.salesOrders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Draft');
    const inRange = (o, a, b) => now - new Date(o.date) >= a * 864e5 && now - new Date(o.date) < b * 864e5;
    const rev30 = live.filter((o) => inRange(o, 0, 30)).reduce((s, o) => s + o.total, 0);
    const revPrev = live.filter((o) => inRange(o, 30, 60)).reduce((s, o) => s + o.total, 0);
    const ar = db.invoices.filter((i) => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
    const overdue = db.invoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
    const open = db.salesOrders.filter((o) => ['Draft', 'Confirmed', 'Shipped'].includes(o.status));
    const invValue = db.products.reduce((s, p) => s + p.stock * p.cost, 0);

    const months = lastMonths(12).map((m) => ({ ...m, revenue: 0, expenses: 0 }));
    const idx = (d) => months.findIndex((m) => m.year === new Date(d).getFullYear() && m.month === new Date(d).getMonth());
    live.forEach((o) => { const i = idx(o.date); if (i >= 0) months[i].revenue += o.total; });
    db.expenses.forEach((e) => { const i = idx(e.date); if (i >= 0) months[i].expenses += e.amount; });
    db.purchaseOrders.filter((p) => p.status === 'Received').forEach((p) => { const i = idx(p.date); if (i >= 0) months[i].expenses += p.total; });
    db.payrollRuns.forEach((p) => { const i = idx(p.date); if (i >= 0) months[i].expenses += p.gross; });

    const cat = {};
    live.forEach((o) => o.lines.forEach((l) => { const c = products[l.productId]?.category || 'Other'; cat[c] = (cat[c] || 0) + l.qty * l.price; }));
    const byCat = Object.entries(cat).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);

    const cust = {};
    live.forEach((o) => (cust[o.customerId] = (cust[o.customerId] || 0) + o.total));
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => ({ name: customers[id]?.name || '—', revenue: Math.round(v) }));

    return { rev30, revDelta: revPrev ? ((rev30 - revPrev) / revPrev) * 100 : 0, ar, overdue, open, invValue, months, byCat, topCustomers };
  }, [db]); // eslint-disable-line

  const recent = [...db.salesOrders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  const lowStock = db.products.filter((p) => p.stock <= p.reorder).slice(0, 5);
  const pending = db.leaves.filter((l) => l.status === 'Pending').length;
  const empMap = byId(db.employees);

  return (
    <>
      <PageHeader
        title="Good morning, Alex 👋"
        subtitle={`Here's what's happening at ${db.company.name} today.`}
        actions={
          <>
            <Link to="/finance/reports"><Button variant="secondary">View reports</Button></Link>
            <Link to="/sales/orders?new=1"><Button icon={ShoppingCart}>New sales order</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30 days)" value={money(stats.rev30)} delta={stats.revDelta} hint="vs previous 30 days" icon={DollarSign} />
        <StatCard label="Receivables" value={money(stats.ar)} hint={`${money(stats.overdue)} overdue`} icon={FileWarning} tone="red" />
        <StatCard label="Open sales orders" value={stats.open.length} hint={`${money(stats.open.reduce((s, o) => s + o.total, 0))} in pipeline`} icon={ShoppingCart} tone="blue" />
        <StatCard label="Inventory value" value={money(stats.invValue)} hint={`${db.products.length} SKUs across 3 warehouses`} icon={Package} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue vs. expenses" subtitle="Last 12 months" />
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <AreaChart data={stats.months} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => '$' + compact(v)} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Sales by category" subtitle="All-time, excluding drafts" />
          <div className="h-56 p-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {stats.byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 px-5 pb-5 text-xs">
            {stats.byCat.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="font-medium text-slate-900">{compact(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent sales orders" action={<Link to="/sales/orders" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{o.number}</td>
                    <td className="px-5 py-3 text-slate-600">{customers[o.customerId]?.name}</td>
                    <td className="px-5 py-3 text-slate-500">{date(o.date)}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} map={SO_TONE} /></td>
                    <td className="px-5 py-3 text-right font-medium">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Low stock alerts" action={<Badge tone="yellow">{db.products.filter((p) => p.stock <= p.reorder).length}</Badge>} />
            <ul className="divide-y divide-slate-100">
              {lowStock.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">All items are well stocked.</li>}
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <AlertTriangle size={16} className={p.stock === 0 ? 'text-rose-500' : 'text-amber-500'} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.sku}</div>
                  </div>
                  <span className={p.stock === 0 ? 'text-sm font-semibold text-rose-600' : 'text-sm font-semibold text-amber-600'}>{p.stock}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 p-3">
              <Link to="/purchasing/orders?new=1" className="flex items-center justify-center gap-1 text-xs font-medium text-brand-600 hover:underline">Create purchase order <ArrowRight size={12} /></Link>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">People</div>
            <div className="mt-3 grid grid-cols-3 text-center">
              <div><div className="text-xl font-semibold">{db.employees.length}</div><div className="text-xs text-slate-500">Employees</div></div>
              <div><div className="text-xl font-semibold">{db.employees.filter((e) => e.status === 'On leave').length}</div><div className="text-xs text-slate-500">On leave</div></div>
              <Link to="/hr/leave"><div className="text-xl font-semibold text-amber-600">{pending}</div><div className="text-xs text-slate-500">Approvals</div></Link>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Top customers" subtitle="By lifetime order value" />
        <div className="h-64 p-4">
          <ResponsiveContainer>
            <BarChart data={stats.topCustomers} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => '$' + compact(v)} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="mt-6 text-center text-xs text-slate-400">Live demo data · changes are saved in your browser</p>
    </>
  );
}
