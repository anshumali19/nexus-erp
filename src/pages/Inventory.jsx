import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, SlidersHorizontal, Package, AlertTriangle, DollarSign, Layers } from 'lucide-react';
import { useDB } from '../kit/db';
import { PageHeader, Button, DataTable, FormModal, Badge, StatCard, Progress, useToast } from '../kit/ui';
import { money, money2, num } from '../kit/format';

const FIELDS = [
  { name: 'name', label: 'Product name', required: true, span: 2 },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Electronics', 'Furniture', 'Supplies', 'Networking'] },
  { name: 'unit', label: 'Unit', type: 'select', options: ['pcs', 'box', 'pack', 'roll'] },
  { name: 'warehouse', label: 'Warehouse', type: 'select', options: ['Main WH – Oakland', 'East Hub – Newark', 'Retail Store – SF'] },
  { name: 'cost', label: 'Unit cost ($)', type: 'number', required: true },
  { name: 'price', label: 'Sale price ($)', type: 'number', required: true },
  { name: 'stock', label: 'Stock on hand', type: 'number' },
  { name: 'reorder', label: 'Reorder level', type: 'number' },
];

export default function Inventory() {
  const { db, add, update, remove } = useDB();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [params] = useSearchParams();

  const value = db.products.reduce((s, p) => s + p.stock * p.cost, 0);
  const retail = db.products.reduce((s, p) => s + p.stock * p.price, 0);
  const low = db.products.filter((p) => p.stock > 0 && p.stock <= p.reorder).length;
  const out = db.products.filter((p) => p.stock === 0).length;

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock on hand across all warehouses. Shipping a sales order or receiving a PO updates these numbers automatically." actions={<Button icon={Plus} onClick={() => setEdit({})}>Add product</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={db.products.length} icon={Layers} hint={`${num(db.products.reduce((s, p) => s + p.stock, 0))} units on hand`} />
        <StatCard label="Stock value (cost)" value={money(value)} icon={DollarSign} tone="green" hint={`${money(retail)} at retail`} />
        <StatCard label="Low stock" value={low} icon={AlertTriangle} tone="yellow" hint="at or below reorder level" />
        <StatCard label="Out of stock" value={out} icon={Package} tone="red" hint="needs immediate reorder" />
      </div>
      <DataTable
        rows={db.products.map((p) => ({ ...p, margin: p.price ? ((p.price - p.cost) / p.price) * 100 : 0, health: p.stock === 0 ? 'Out of stock' : p.stock <= p.reorder ? 'Low' : 'In stock' }))}
        initialQuery={params.get('q') || undefined}
        exportName="inventory"
        searchKeys={['name', 'sku', 'category', 'warehouse']}
        filter={{ key: 'health', options: ['In stock', 'Low', 'Out of stock'] }}
        columns={[
          { key: 'name', label: 'Product', render: (r) => (<div><div className="font-medium text-slate-900">{r.name}</div><div className="text-xs text-slate-500">{r.sku} · {r.category}</div></div>) },
          { key: 'warehouse', label: 'Location', render: (r) => <span className="text-slate-500">{r.warehouse}</span> },
          { key: 'stock', label: 'On hand', render: (r) => (
            <div className="w-32">
              <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-800">{r.stock} {r.unit}</span><span className="text-slate-400">min {r.reorder}</span></div>
              <Progress value={r.stock} max={Math.max(r.reorder * 4, r.stock)} tone={r.stock === 0 ? 'red' : r.stock <= r.reorder ? 'yellow' : 'green'} />
            </div>
          ) },
          { key: 'health', label: 'Status', render: (r) => <Badge tone={r.health === 'In stock' ? 'green' : r.health === 'Low' ? 'yellow' : 'red'} dot>{r.health}</Badge> },
          { key: 'cost', label: 'Cost', align: 'right', render: (r) => money2(r.cost) },
          { key: 'price', label: 'Price', align: 'right', render: (r) => money2(r.price) },
          { key: 'margin', label: 'Margin', align: 'right', render: (r) => `${r.margin.toFixed(0)}%` },
          { key: 'actions', label: '', sortable: false, render: (r) => (
            <div className="flex justify-end gap-1">
              <Button size="xs" variant="ghost" icon={SlidersHorizontal} onClick={() => setAdjust(r)} title="Adjust stock" />
              <Button size="xs" variant="ghost" icon={Pencil} onClick={() => setEdit(r)} />
              <Button size="xs" variant="ghost" icon={Trash2} onClick={() => { if (confirm(`Delete ${r.name}?`)) { remove('products', r.id); toast('Product deleted'); } }} />
            </div>
          ) },
        ]}
      />
      <FormModal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Edit product' : 'New product'}
        fields={FIELDS}
        initial={edit}
        onSubmit={(v) => { const { margin, health, ...clean } = v; edit.id ? update('products', edit.id, clean) : add('products', clean); toast('Product saved'); setEdit(null); }}
      />
      <FormModal
        open={!!adjust}
        onClose={() => setAdjust(null)}
        title={`Adjust stock — ${adjust?.name}`}
        submitLabel="Apply adjustment"
        fields={[
          { name: 'type', label: 'Adjustment', type: 'select', options: ['Add stock', 'Remove stock', 'Set exact count'] },
          { name: 'qty', label: 'Quantity', type: 'number', required: true },
          { name: 'reason', label: 'Reason', type: 'select', options: ['Cycle count', 'Damaged goods', 'Return to stock', 'Correction'], span: 2 },
        ]}
        onSubmit={({ type, qty }) => {
          const s = adjust.stock;
          const next = type === 'Add stock' ? s + qty : type === 'Remove stock' ? Math.max(0, s - qty) : Math.max(0, qty);
          update('products', adjust.id, { stock: next });
          toast(`${adjust.name}: ${s} → ${next}`);
          setAdjust(null);
        }}
      />
    </>
  );
}
