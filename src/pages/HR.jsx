import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Users, Banknote, CalendarDays, Play, Mail, Phone, MapPin } from 'lucide-react';
import { useDB } from '../kit/db';
import { PageHeader, Button, DataTable, FormModal, Badge, StatCard, StatusBadge, Avatar, Card, CardHeader, Modal, Drawer, useToast } from '../kit/ui';
import { money, money2, date } from '../kit/format';
import { LEAVE_TONE, byId } from './shared';

const DEPTS = ['Sales', 'Operations', 'Finance', 'Engineering', 'Human Resources', 'Marketing'];
const EMP_FIELDS = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'email', label: 'Work email', type: 'email', required: true },
  { name: 'dept', label: 'Department', type: 'select', options: DEPTS },
  { name: 'role', label: 'Job title', required: true },
  { name: 'salary', label: 'Annual salary ($)', type: 'number' },
  { name: 'joined', label: 'Start date', type: 'date' },
  { name: 'location', label: 'Location', type: 'select', options: ['San Francisco', 'Oakland', 'Newark', 'Remote'] },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On leave'] },
  { name: 'phone', label: 'Phone' },
];

export function Employees() {
  const { db, add, update, remove } = useDB();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [viewId, setViewId] = useState(null);
  const view = db.employees.find((e) => e.id === viewId);
  const payroll = db.employees.reduce((s, e) => s + e.salary, 0);
  const deptCounts = DEPTS.map((d) => ({ d, n: db.employees.filter((e) => e.dept === d).length }));
  return (
    <>
      <PageHeader title="Employees" subtitle="Your team directory." actions={<Button icon={Plus} onClick={() => setEdit({ joined: new Date().toISOString(), status: 'Active' })}>Add employee</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Headcount" value={db.employees.length} icon={Users} />
        <StatCard label="Annual payroll" value={money(payroll)} icon={Banknote} tone="green" />
        <StatCard label="Avg. salary" value={money(payroll / (db.employees.length || 1))} icon={Banknote} tone="purple" />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {deptCounts.map(({ d, n }) => <Badge key={d} tone="brand">{d} · {n}</Badge>)}
      </div>
      <DataTable
        rows={db.employees}
        exportName="employees"
        searchKeys={['name', 'email', 'role', 'dept', 'code']}
        filter={{ key: 'dept', options: DEPTS }}
        onRowClick={(r) => setViewId(r.id)}
        columns={[
          { key: 'name', label: 'Employee', render: (r) => (<div className="flex items-center gap-3"><Avatar name={r.name} /><div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.email}</div></div></div>) },
          { key: 'code', label: 'ID', render: (r) => <span className="text-slate-500">{r.code || '—'}</span> },
          { key: 'role', label: 'Role', render: (r) => (<div><div>{r.role}</div><div className="text-xs text-slate-500">{r.dept}</div></div>) },
          { key: 'location', label: 'Location' },
          { key: 'joined', label: 'Joined', render: (r) => date(r.joined), sortValue: (r) => new Date(r.joined).getTime(), csv: (r) => date(r.joined) },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'green' : 'yellow'} dot>{r.status}</Badge> },
          { key: 'salary', label: 'Salary', align: 'right', render: (r) => money(r.salary) },
        ]}
      />
      <FormModal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit employee' : 'New employee'} fields={EMP_FIELDS} initial={edit}
        onSubmit={(v) => {
          if (edit.id) update('employees', edit.id, v);
          else add('employees', { ...v, code: `EMP-${100 + db.employees.length + 1}` });
          toast('Employee saved'); setEdit(null);
        }} />
      <Drawer open={!!view} onClose={() => setViewId(null)} title="Employee profile"
        footer={view && (<>
          <Button variant="secondary" icon={Trash2} onClick={() => { if (confirm('Remove this employee?')) { remove('employees', view.id); setViewId(null); toast('Employee removed'); } }}>Remove</Button>
          <Button icon={Pencil} onClick={() => { setEdit(view); setViewId(null); }}>Edit</Button>
        </>)}>
        {view && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={view.name} size={64} />
              <div>
                <div className="text-lg font-semibold">{view.name}</div>
                <div className="text-sm text-slate-500">{view.role} · {view.dept}</div>
                <Badge tone={view.status === 'Active' ? 'green' : 'yellow'} className="mt-2">{view.status}</Badge>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><Mail size={15} /> {view.email}</div>
              <div className="flex items-center gap-2"><Phone size={15} /> {view.phone || '—'}</div>
              <div className="flex items-center gap-2"><MapPin size={15} /> {view.location}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><div className="text-xs text-slate-500">Annual salary</div><div className="font-semibold">{money(view.salary)}</div></Card>
              <Card className="p-3"><div className="text-xs text-slate-500">Joined</div><div className="font-semibold">{date(view.joined)}</div></Card>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Leave history</h4>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {db.leaves.filter((l) => l.employeeId === view.id).map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-3 py-2 text-sm"><span>{l.type}</span><span className="text-slate-500">{date(l.from)} · {l.days}d</span><StatusBadge status={l.status} map={LEAVE_TONE} /></li>
                ))}
                {db.leaves.filter((l) => l.employeeId === view.id).length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">No leave taken</li>}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

export function Leave() {
  const { db, add, update } = useDB();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const emp = byId(db.employees);
  const rows = db.leaves.map((l) => ({ ...l, employee: emp[l.employeeId]?.name || '—' }));
  const decide = (l, status) => { update('leaves', l.id, { status }); toast(`Leave ${status.toLowerCase()} for ${l.employee}`); };
  const pending = rows.filter((l) => l.status === 'Pending');
  return (
    <>
      <PageHeader title="Leave management" subtitle="Requests, approvals and time off." actions={<Button icon={Plus} onClick={() => setCreating(true)}>Request leave</Button>} />
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Awaiting your approval" subtitle={`${pending.length} request(s)`} />
          <ul className="divide-y divide-slate-100">
            {pending.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <Avatar name={l.employee} />
                  <div>
                    <div className="text-sm font-medium">{l.employee} <span className="font-normal text-slate-500">· {l.type}</span></div>
                    <div className="text-xs text-slate-500">{date(l.from)} → {date(l.to)} ({l.days} day{l.days > 1 ? 's' : ''}) · “{l.reason}”</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={X} onClick={() => decide(l, 'Rejected')}>Reject</Button>
                  <Button size="sm" variant="success" icon={Check} onClick={() => decide(l, 'Approved')}>Approve</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <DataTable
        rows={rows}
        exportName="leave"
        searchKeys={['employee', 'type', 'reason']}
        filter={{ key: 'status', options: ['Pending', 'Approved', 'Rejected'] }}
        initialSort={{ key: 'from', dir: 'desc' }}
        columns={[
          { key: 'employee', label: 'Employee', render: (r) => <div className="flex items-center gap-2"><Avatar name={r.employee} size={28} /><span className="font-medium text-slate-900">{r.employee}</span></div> },
          { key: 'type', label: 'Type', render: (r) => <Badge tone={r.type === 'Sick' ? 'red' : r.type === 'Vacation' ? 'blue' : 'purple'}>{r.type}</Badge> },
          { key: 'from', label: 'From', render: (r) => date(r.from), sortValue: (r) => new Date(r.from).getTime(), csv: (r) => date(r.from) },
          { key: 'to', label: 'To', render: (r) => date(r.to), sortValue: (r) => new Date(r.to).getTime(), csv: (r) => date(r.to) },
          { key: 'days', label: 'Days', align: 'right' },
          { key: 'reason', label: 'Reason', render: (r) => <span className="text-slate-500">{r.reason}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} map={LEAVE_TONE} /> },
        ]}
      />
      <FormModal open={creating} onClose={() => setCreating(false)} title="New leave request"
        fields={[
          { name: 'employeeId', label: 'Employee', type: 'select', options: db.employees.map((e) => ({ value: e.id, label: e.name })), span: 2 },
          { name: 'type', label: 'Leave type', type: 'select', options: ['Vacation', 'Sick', 'Personal', 'Parental'] },
          { name: 'days', label: 'Days', type: 'number', default: 1 },
          { name: 'from', label: 'Start date', type: 'date', required: true },
          { name: 'reason', label: 'Reason', span: 2 },
        ]}
        onSubmit={(v) => {
          const to = new Date(new Date(v.from).getTime() + (Math.max(1, v.days) - 1) * 864e5).toISOString();
          add('leaves', { ...v, to, status: 'Pending' });
          toast('Leave request submitted'); setCreating(false);
        }} />
    </>
  );
}

export function Payroll() {
  const { db, add } = useDB();
  const toast = useToast();
  const [slip, setSlip] = useState(null);
  const now = new Date();
  const period = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const done = db.payrollRuns.some((p) => p.period === period);
  const active = db.employees.filter((e) => e.status === 'Active' || e.status === 'On leave');
  const calc = (e) => { const gross = Math.round(e.salary / 12); const tax = Math.round(gross * 0.18); const benefits = Math.round(gross * 0.04); return { gross, tax, benefits, net: gross - tax - benefits }; };
  const total = active.reduce((s, e) => s + calc(e).gross, 0);

  const run = () => {
    const gross = total;
    const deductions = active.reduce((s, e) => s + calc(e).tax + calc(e).benefits, 0);
    add('payrollRuns', { period, date: now.toISOString(), employees: active.length, gross, deductions, net: gross - deductions, status: 'Paid' });
    toast(`Payroll for ${period} processed — ${money(gross - deductions)} net paid`);
  };

  return (
    <>
      <PageHeader title="Payroll" subtitle="Monthly salary runs and payslips." actions={<Button icon={Play} disabled={done} onClick={run}>{done ? `${period} processed` : `Run payroll for ${period}`}</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly gross" value={money(total)} icon={Banknote} />
        <StatCard label="Employees paid" value={active.length} icon={Users} tone="blue" />
        <StatCard label="Next pay date" value={date(new Date(now.getFullYear(), now.getMonth() + 1, 0))} icon={CalendarDays} tone="purple" />
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Payroll history" />
          <ul className="divide-y divide-slate-100">
            {[...db.payrollRuns].sort((a, b) => new Date(b.date) - new Date(a.date)).map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div><div className="font-medium">{p.period}</div><div className="text-xs text-slate-500">{p.employees} employees · paid {date(p.date)}</div></div>
                <div className="text-right"><div className="font-semibold">{money(p.net)}</div><div className="text-xs text-slate-500">gross {money(p.gross)}</div></div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="xl:col-span-3">
          <DataTable
            rows={active.map((e) => ({ ...e, ...calc(e) }))}
            searchKeys={['name', 'dept']}
            pageSize={8}
            exportName="payroll"
            columns={[
              { key: 'name', label: 'Employee', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
              { key: 'gross', label: 'Gross', align: 'right', render: (r) => money2(r.gross) },
              { key: 'tax', label: 'Tax', align: 'right', render: (r) => money2(r.tax) },
              { key: 'net', label: 'Net', align: 'right', render: (r) => <span className="font-medium">{money2(r.net)}</span> },
              { key: 'slip', label: '', sortable: false, render: (r) => <Button size="xs" variant="secondary" onClick={() => setSlip(r)}>Payslip</Button> },
            ]}
          />
        </div>
      </div>
      <Modal open={!!slip} onClose={() => setSlip(null)} title={`Payslip — ${period}`} footer={<Button onClick={() => window.print()}>Print</Button>}>
        {slip && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><div><div className="font-semibold">{slip.name}</div><div className="text-slate-500">{slip.role} · {slip.code}</div></div><div className="text-right text-slate-500">{db.company.name}</div></div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              <div className="flex justify-between px-4 py-2"><span>Basic salary</span><span>{money2(slip.gross)}</span></div>
              <div className="flex justify-between px-4 py-2 text-rose-600"><span>Income tax</span><span>-{money2(slip.tax)}</span></div>
              <div className="flex justify-between px-4 py-2 text-rose-600"><span>Health & benefits</span><span>-{money2(slip.benefits)}</span></div>
              <div className="flex justify-between bg-slate-50 px-4 py-2 font-semibold"><span>Net pay</span><span>{money2(slip.net)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
