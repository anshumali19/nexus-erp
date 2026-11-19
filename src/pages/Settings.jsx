import { useState } from 'react';
import { Save } from 'lucide-react';
import { useDB } from '../kit/db';
import { PageHeader, Card, CardHeader, Field, Input, Select, Button, Toggle, useToast } from '../kit/ui';

export default function Settings() {
  const { db, setKey } = useDB();
  const toast = useToast();
  const [c, setC] = useState(db.company);
  const [prefs, setPrefs] = useState({ lowStock: true, overdue: true, weekly: false, twofa: true });
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value });
  return (
    <>
      <PageHeader title="Settings" subtitle="Company profile, tax and notification preferences." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Company profile" subtitle="Shown on invoices, purchase orders and payslips." />
          <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setKey('company', { ...c, taxRate: Number(c.taxRate) || 0 }); toast('Settings saved'); }}>
            <Field label="Company name" className="sm:col-span-2"><Input value={c.name} onChange={set('name')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={c.address} onChange={set('address')} /></Field>
            <Field label="Billing email"><Input value={c.email} onChange={set('email')} /></Field>
            <Field label="Phone"><Input value={c.phone} onChange={set('phone')} /></Field>
            <Field label="Currency"><Select value={c.currency} onChange={set('currency')} options={['USD', 'EUR', 'GBP', 'INR', 'AED']} /></Field>
            <Field label="Sales tax rate (%)"><Input type="number" step="0.1" value={c.taxRate} onChange={set('taxRate')} /></Field>
            <Field label="Fiscal year starts"><Select value={c.fiscalYearStart} onChange={set('fiscalYearStart')} options={['January', 'April', 'July', 'October']} /></Field>
            <div className="flex items-end justify-end sm:col-span-2"><Button icon={Save}>Save changes</Button></div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Notifications & security" />
          <div className="space-y-4 p-5">
            <Toggle checked={prefs.lowStock} onChange={(v) => setPrefs({ ...prefs, lowStock: v })} label="Low stock alerts" />
            <Toggle checked={prefs.overdue} onChange={(v) => setPrefs({ ...prefs, overdue: v })} label="Overdue invoice reminders" />
            <Toggle checked={prefs.weekly} onChange={(v) => setPrefs({ ...prefs, weekly: v })} label="Weekly summary email" />
            <Toggle checked={prefs.twofa} onChange={(v) => setPrefs({ ...prefs, twofa: v })} label="Require two-factor sign-in" />
          </div>
          <div className="border-t border-slate-100 p-5 text-xs text-slate-500">
            Modules enabled: Sales · Purchasing · Inventory · Finance · HR & Payroll
          </div>
        </Card>
      </div>
    </>
  );
}
