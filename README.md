# Nexus ERP

A complete ERP demo for a distribution business — sales, purchasing, inventory, finance and HR in one connected workspace.

**Live demo:** _LIVE_URL_

> Demo data is generated in the browser and saved to `localStorage`, so every visitor gets their own sandbox. Create, edit and delete freely — use **Reset demo data** to start over.

## Features

- Dashboard with revenue vs. expenses, sales by category, top customers, low-stock and approval alerts
- Sales orders with line items, tax, status workflow (Draft → Confirmed → Shipped → Delivered) and one-click invoicing
- Shipping an order deducts stock; receiving a purchase order adds stock — modules share one data model
- Customers & suppliers with lifetime value, balances and order history
- Invoices with receivables aging and payment recording; expenses by category
- Profit & loss report (revenue, COGS, gross/net profit, margins) for the trailing 12 months
- Employees directory, leave requests with approve/reject, payroll runs and printable payslips
- Company settings (tax rate, currency, fiscal year), CSV export on every table

## Tech stack

- React 18 + Vite
- Tailwind CSS v4
- React Router
- Recharts (charts) & Lucide (icons)
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

Build for production with `npm run build` (outputs to `dist/`).

## Making it production-ready

This demo runs entirely in the browser. For a client project, the same UI connects to a real backend (e.g. Supabase / PostgreSQL + REST or tRPC API), with authentication, role-based permissions and server-side validation.
