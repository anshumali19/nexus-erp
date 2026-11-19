import { rng, pick, int, fullName, emailOf, phone, daysAgo, daysFromNow, COMPANIES, CITIES, uid } from './kit/format';

const PRODUCTS = [
  ['Ergonomic Office Chair', 'Furniture', 'pcs', 145, 289],
  ['Standing Desk Pro', 'Furniture', 'pcs', 310, 599],
  ['27" 4K Monitor', 'Electronics', 'pcs', 220, 399],
  ['Wireless Keyboard', 'Electronics', 'pcs', 28, 69],
  ['Wireless Mouse', 'Electronics', 'pcs', 12, 34],
  ['USB-C Docking Station', 'Electronics', 'pcs', 85, 179],
  ['Noise-Cancelling Headset', 'Electronics', 'pcs', 64, 149],
  ['Laptop 14" Business', 'Electronics', 'pcs', 720, 1199],
  ['A4 Copy Paper (Box)', 'Supplies', 'box', 18, 36],
  ['Printer Toner Black', 'Supplies', 'pcs', 42, 89],
  ['Whiteboard 120x90', 'Furniture', 'pcs', 55, 119],
  ['Filing Cabinet 3-Drawer', 'Furniture', 'pcs', 95, 189],
  ['LED Desk Lamp', 'Furniture', 'pcs', 19, 45],
  ['Network Switch 24-port', 'Networking', 'pcs', 160, 329],
  ['Wi-Fi 6 Access Point', 'Networking', 'pcs', 95, 199],
  ['Cat6 Cable 305m', 'Networking', 'roll', 75, 149],
  ['Conference Speakerphone', 'Electronics', 'pcs', 110, 239],
  ['Webcam 1080p', 'Electronics', 'pcs', 29, 79],
  ['Sticky Notes (Pack of 12)', 'Supplies', 'pack', 4, 11],
  ['Ballpoint Pens (Box of 50)', 'Supplies', 'box', 7, 19],
];

const DEPTS = {
  Sales: ['Account Executive', 'Sales Manager', 'SDR'],
  Operations: ['Warehouse Lead', 'Logistics Coordinator', 'Ops Manager'],
  Finance: ['Accountant', 'Finance Manager', 'AP Specialist'],
  Engineering: ['Software Engineer', 'IT Administrator', 'Engineering Manager'],
  'Human Resources': ['HR Generalist', 'Recruiter'],
  Marketing: ['Marketing Manager', 'Content Specialist'],
};

export const SO_STATUSES = ['Draft', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
export const PO_STATUSES = ['Draft', 'Ordered', 'Received', 'Cancelled'];
export const EXPENSE_CATS = ['Rent', 'Utilities', 'Marketing', 'Travel', 'Software', 'Logistics', 'Maintenance'];

export function totals(lines, taxRate) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = Math.round(subtotal * taxRate) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

export function seed() {
  const r = rng(7);
  const company = { name: 'Northwind Supplies Ltd.', currency: 'USD', taxRate: 8, address: '221 Market Street, San Francisco, CA', email: 'accounts@northwind.example', phone: '+1 (415) 555-0142', fiscalYearStart: 'January' };

  const customers = COMPANIES.slice(0, 18).map((name, i) => {
    const contact = fullName(r);
    return { id: `c${i}`, name, contact, email: emailOf(contact, name.toLowerCase().replace(/[^a-z]/g, '') + '.com'), phone: phone(r), city: pick(r, CITIES), segment: pick(r, ['Enterprise', 'Mid-market', 'SMB']), creditLimit: pick(r, [10000, 25000, 50000, 100000]), createdAt: daysAgo(int(r, 60, 700)) };
  });

  const supplierNames = ['TechSource Global', 'OfficePro Wholesale', 'Metro Furniture Co', 'NetLink Distributors', 'PaperWorks Inc', 'Pacific Electronics', 'Summit Logistics Supply', 'Prime Components'];
  const suppliers = supplierNames.map((name, i) => {
    const contact = fullName(r);
    return { id: `s${i}`, name, contact, email: emailOf(contact, name.toLowerCase().replace(/[^a-z]/g, '') + '.com'), phone: phone(r), city: pick(r, CITIES), category: pick(r, ['Electronics', 'Furniture', 'Supplies', 'Networking']), rating: int(r, 3, 5), leadDays: int(r, 3, 21), createdAt: daysAgo(int(r, 200, 900)) };
  });

  const products = PRODUCTS.map(([name, category, unit, cost, price], i) => ({
    id: `p${i}`, sku: `NW-${String(1000 + i * 7)}`, name, category, unit, cost, price,
    stock: i % 6 === 2 ? int(r, 0, 8) : int(r, 25, 260), reorder: int(r, 10, 30), warehouse: pick(r, ['Main WH – Oakland', 'East Hub – Newark', 'Retail Store – SF']), createdAt: daysAgo(400),
  }));

  const salesOrders = [];
  const invoices = [];
  for (let i = 0; i < 240; i++) {
    const age = Math.floor(Math.pow(r(), 1.4) * 360);
    const lines = Array.from({ length: int(r, 1, 4) }, () => {
      const p = pick(r, products);
      return { productId: p.id, name: p.name, qty: int(r, 5, 60), price: p.price };
    });
    const t = totals(lines, company.taxRate);
    let status = age > 30 ? (r() < 0.06 ? 'Cancelled' : 'Delivered') : pick(r, ['Draft', 'Confirmed', 'Confirmed', 'Shipped', 'Delivered']);
    const cust = pick(r, customers);
    const so = { id: `so${i}`, number: `SO-${10400 + i}`, customerId: cust.id, date: daysAgo(age), lines, ...t, status, invoiced: false, createdAt: daysAgo(age) };
    if (['Shipped', 'Delivered'].includes(status)) {
      so.invoiced = true;
      const due = new Date(new Date(so.date).getTime() + 30 * 864e5);
      const paid = age > 45 ? r() < 0.95 : age > 20 ? r() < 0.55 : r() < 0.2;
      invoices.push({ id: `inv${i}`, number: `INV-${30400 + i}`, customerId: cust.id, orderId: so.id, orderNumber: so.number, date: so.date, due: due.toISOString(), amount: so.total, status: paid ? 'Paid' : due < new Date() ? 'Overdue' : 'Unpaid', paidAt: paid ? new Date(new Date(so.date).getTime() + int(r, 5, 35) * 864e5).toISOString() : null, createdAt: so.date });
    }
    salesOrders.push(so);
  }

  const purchaseOrders = Array.from({ length: 34 }, (_, i) => {
    const age = int(r, 0, 340);
    const sup = pick(r, suppliers);
    const lines = Array.from({ length: int(r, 1, 3) }, () => {
      const p = pick(r, products);
      return { productId: p.id, name: p.name, qty: int(r, 20, 120), price: p.cost };
    });
    const t = totals(lines, company.taxRate);
    return { id: `po${i}`, number: `PO-${20100 + i}`, supplierId: sup.id, date: daysAgo(age), expected: daysAgo(age - sup.leadDays), lines, ...t, status: age > 25 ? 'Received' : pick(r, ['Draft', 'Ordered', 'Ordered', 'Received']), createdAt: daysAgo(age) };
  });

  const expenses = [];
  for (let m = 0; m < 12; m++) {
    expenses.push({ id: uid(), date: daysAgo(m * 30 + 1), category: 'Rent', description: 'Warehouse & office lease', vendor: 'Bayview Properties', amount: 18500 });
    expenses.push({ id: uid(), date: daysAgo(m * 30 + 4), category: 'Utilities', description: 'Power, water & internet', vendor: 'PG&E / Comcast', amount: int(r, 2800, 4200) });
    for (let k = 0; k < 4; k++) {
      const cat = pick(r, ['Marketing', 'Travel', 'Software', 'Logistics', 'Maintenance']);
      const vend = { Marketing: 'Google Ads', Travel: 'Delta / Marriott', Software: 'SaaS subscriptions', Logistics: 'FedEx Freight', Maintenance: 'FixIt Services' }[cat];
      expenses.push({ id: uid(), date: daysAgo(m * 30 + int(r, 2, 28)), category: cat, description: `${cat} – monthly`, vendor: vend, amount: int(r, 900, 9000) });
    }
  }

  const employees = Array.from({ length: 18 }, (_, i) => {
    const name = fullName(r);
    const dept = pick(r, Object.keys(DEPTS));
    return { id: `e${i}`, code: `EMP-${String(101 + i)}`, name, email: emailOf(name, 'northwind.example'), phone: phone(r), dept, role: pick(r, DEPTS[dept]), salary: int(r, 42, 120) * 1000, joined: daysAgo(int(r, 30, 2400)), status: r() < 0.9 ? 'Active' : 'On leave', location: pick(r, ['San Francisco', 'Oakland', 'Remote', 'Newark']), createdAt: daysAgo(100) };
  });

  const leaves = Array.from({ length: 14 }, (_, i) => {
    const e = pick(r, employees);
    const start = int(r, -20, 40);
    const days = int(r, 1, 6);
    return { id: `l${i}`, employeeId: e.id, type: pick(r, ['Vacation', 'Sick', 'Personal', 'Parental']), from: daysFromNow(start), to: daysFromNow(start + days - 1), days, status: start < 0 ? pick(r, ['Approved', 'Approved', 'Rejected']) : pick(r, ['Pending', 'Pending', 'Approved']), reason: pick(r, ['Family trip', 'Medical appointment', 'Personal matters', 'Wedding', 'Feeling unwell']), createdAt: daysAgo(10) };
  });

  const payrollRuns = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    const gross = Math.round(employees.reduce((s, e) => s + e.salary / 12, 0));
    const deductions = Math.round(gross * 0.22);
    return { id: `pr${i}`, period: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), date: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString(), employees: employees.length, gross, deductions, net: gross - deductions, status: 'Paid', createdAt: d.toISOString() };
  });

  return { company, customers, suppliers, products, salesOrders, purchaseOrders, invoices, expenses, employees, leaves, payrollRuns };
}
