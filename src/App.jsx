import { Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Users, Truck, Building2, Package, FileText, Receipt, BarChart3,
  UserCog, CalendarDays, Banknote, Settings as SettingsIcon, Boxes,
} from 'lucide-react';
import { Shell, Login, RequireAuth } from './kit/Shell';
import { useDB } from './kit/db';
import { money } from './kit/format';
import Dashboard from './pages/Dashboard';
import { SalesOrders, Customers } from './pages/Sales';
import { PurchaseOrders, Suppliers } from './pages/Purchasing';
import Inventory from './pages/Inventory';
import { Invoices, Expenses, Reports } from './pages/Finance';
import { Employees, Leave, Payroll } from './pages/HR';
import Settings from './pages/Settings';

const brand = {
  name: 'Nexus ERP',
  tagline: 'Northwind Supplies Ltd.',
  icon: Boxes,
  sessionKey: 'nexus-erp-auth',
  headline: 'Run your entire business from one connected workspace.',
  description: 'Sales, purchasing, inventory, finance and people — every module shares the same data, so an order you ship updates stock, invoices and reports instantly.',
};

export default function App() {
  const { db } = useDB();
  const lowStock = db.products.filter((p) => p.stock <= p.reorder);
  const overdue = db.invoices.filter((i) => i.status === 'Overdue');
  const pendingLeave = db.leaves.filter((l) => l.status === 'Pending');
  const openSO = db.salesOrders.filter((o) => ['Draft', 'Confirmed'].includes(o.status)).length;

  const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'Sales' },
    { to: '/sales/orders', label: 'Sales Orders', icon: ShoppingCart, badge: openSO },
    { to: '/sales/customers', label: 'Customers', icon: Users },
    { section: 'Supply chain' },
    { to: '/purchasing/orders', label: 'Purchase Orders', icon: Truck },
    { to: '/purchasing/suppliers', label: 'Suppliers', icon: Building2 },
    { to: '/inventory', label: 'Inventory', icon: Package, badge: lowStock.length || null },
    { section: 'Finance' },
    { to: '/finance/invoices', label: 'Invoices', icon: FileText, badge: overdue.length || null },
    { to: '/finance/expenses', label: 'Expenses', icon: Receipt },
    { to: '/finance/reports', label: 'Reports', icon: BarChart3 },
    { section: 'People' },
    { to: '/hr/employees', label: 'Employees', icon: UserCog },
    { to: '/hr/leave', label: 'Leave', icon: CalendarDays, badge: pendingLeave.length || null },
    { to: '/hr/payroll', label: 'Payroll', icon: Banknote },
    { section: 'System' },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const notifications = [
    ...overdue.slice(0, 3).map((i) => ({ title: `Invoice ${i.number} is overdue`, text: money(i.amount), tone: 'red', to: '/finance/invoices' })),
    ...lowStock.slice(0, 3).map((p) => ({ title: `Low stock: ${p.name}`, text: `${p.stock} ${p.unit} left (reorder at ${p.reorder})`, tone: 'yellow', to: '/inventory' })),
    ...pendingLeave.slice(0, 2).map(() => ({ title: 'Leave request awaiting approval', to: '/hr/leave' })),
  ];

  return (
    <Routes>
      <Route path="/login" element={<Login brand={brand} demoEmail="admin@northwind.example" highlights={['Order-to-cash & procure-to-pay workflows', 'Real-time inventory & low-stock alerts', 'Invoices, expenses and P&L reporting', 'Employees, leave approvals & payroll']} />} />
      <Route
        path="/*"
        element={
          <RequireAuth sessionKey={brand.sessionKey}>
            <Shell brand={brand} nav={nav} user={{ name: 'Alex Morgan', role: 'Administrator' }} notifications={notifications} onSearch={(q, nav) => nav(`/inventory?q=${encodeURIComponent(q)}`)}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sales/orders" element={<SalesOrders />} />
                <Route path="/sales/customers" element={<Customers />} />
                <Route path="/purchasing/orders" element={<PurchaseOrders />} />
                <Route path="/purchasing/suppliers" element={<Suppliers />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/finance/invoices" element={<Invoices />} />
                <Route path="/finance/expenses" element={<Expenses />} />
                <Route path="/finance/reports" element={<Reports />} />
                <Route path="/hr/employees" element={<Employees />} />
                <Route path="/hr/leave" element={<Leave />} />
                <Route path="/hr/payroll" element={<Payroll />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
