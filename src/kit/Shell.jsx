import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, RotateCcw, LogOut, Search, ChevronDown, HelpCircle, Grid3x3, Building2 } from 'lucide-react';
import { Avatar, cx, useToast } from './ui';
import { useDB } from './db';

/**
 * Nexus ERP shell: enterprise-style top application bar + module menu bar.
 * nav: [{ to, label, icon } | { section: 'Label' }] — items after a section become that module's dropdown.
 */
function groupNav(nav) {
  const groups = [];
  let cur = null;
  nav.forEach((n) => {
    if (n.section) { cur = { label: n.section, items: [] }; groups.push(cur); }
    else if (cur) cur.items.push(n);
    else groups.push({ single: n });
  });
  return groups;
}

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && fn();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

export function Shell({ brand, nav, user, children, notifications = [], onSearch }) {
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(null);
  const [bell, setBell] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { reset } = useDB();
  const toast = useToast();
  const barRef = useRef();
  const topRef = useRef();
  useOutside(barRef, () => setMenu(null));
  useOutside(topRef, () => { setBell(false); setUserMenu(false); });
  useEffect(() => { setDrawer(false); setMenu(null); setBell(false); setUserMenu(false); }, [loc.pathname]);

  const groups = groupNav(nav);
  const Logo = brand.icon;
  const inGroup = (g) => g.items?.some((i) => loc.pathname.startsWith(i.to));
  const signOut = () => { sessionStorage.removeItem(brand.sessionKey); navigate(`${brand.base || ''}/login`); };
  const doReset = () => { if (confirm('Reset all demo data to the original sample set?')) { reset(); toast('Demo data restored'); } };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Application bar */}
      <header ref={topRef} className="sticky top-0 z-30 bg-brand-950 text-white">
        <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
          <button className="rounded p-1.5 hover:bg-white/10 lg:hidden cursor-pointer" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={18} /></button>
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-500"><Logo size={15} /></span>
            <span className="text-sm font-semibold tracking-wide">{brand.name}</span>
          </Link>
          <span className="hidden h-5 w-px bg-white/20 md:block" />
          <span className="hidden items-center gap-1.5 text-xs text-white/70 md:flex"><Building2 size={13} /> {brand.tagline}</span>
          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              placeholder="Search products by name or SKU…"
              onKeyDown={(e) => e.key === 'Enter' && onSearch?.(e.currentTarget.value, navigate)}
              className="h-8 w-full rounded bg-white/10 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:bg-white/15"
            />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <span className="mr-1 hidden rounded bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950 sm:inline">Demo</span>
            <button className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Help" onClick={() => toast('Tip: modules share data — ship an order and watch inventory update')}><HelpCircle size={17} /></button>
            <div className="relative">
              <button onClick={() => { setBell((b) => !b); setUserMenu(false); }} className="relative rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Notifications">
                <Bell size={17} />
                {notifications.length > 0 && <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold">{notifications.length}</span>}
              </button>
              {bell && (
                <div className="absolute right-0 mt-2 w-80 rounded border border-slate-200 bg-white py-1 text-slate-800 shadow-xl animate-pop">
                  <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Alerts</div>
                  {notifications.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">No alerts</div>}
                  {notifications.slice(0, 7).map((n, i) => (
                    <button key={i} onClick={() => n.to && navigate(n.to)} className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-slate-50 cursor-pointer">
                      <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-sm', n.tone === 'red' ? 'bg-rose-500' : n.tone === 'yellow' ? 'bg-amber-500' : 'bg-brand-500')} />
                      <span><span className="block text-[13px]">{n.title}</span>{n.text && <span className="block text-xs text-slate-500">{n.text}</span>}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setUserMenu((u) => !u); setBell(false); }} className="ml-1 flex items-center gap-2 rounded py-1 pl-1 pr-2 hover:bg-white/10 cursor-pointer">
                <Avatar name={user.name} size={26} />
                <span className="hidden text-xs sm:block">{user.name}</span>
                <ChevronDown size={13} className="hidden text-white/60 sm:block" />
              </button>
              {userMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-xl animate-pop">
                  <div className="border-b border-slate-100 px-4 py-2"><div className="font-medium text-slate-900">{user.name}</div><div className="text-xs text-slate-500">{user.role}</div></div>
                  <button onClick={doReset} className="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer"><RotateCcw size={14} /> Reset demo data</button>
                  <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer"><LogOut size={14} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Module menu bar */}
        <nav ref={barRef} className="hidden h-11 items-stretch gap-0.5 border-b border-slate-200 bg-white px-3 text-slate-700 shadow-sm lg:flex">
          <span className="mr-2 flex items-center pl-2 text-slate-400"><Grid3x3 size={16} /></span>
          {groups.map((g, gi) =>
            g.single ? (
              <NavLink key={g.single.to} to={g.single.to} end className={({ isActive }) => cx('flex items-center gap-2 border-b-2 px-3.5 text-[13px] font-medium', isActive ? 'border-brand-600 text-brand-700' : 'border-transparent hover:text-slate-950')}>
                <g.single.icon size={15} /> {g.single.label}
              </NavLink>
            ) : (
              <div key={gi} className="relative flex">
                <button onClick={() => setMenu(menu === gi ? null : gi)} className={cx('flex items-center gap-1.5 border-b-2 px-3.5 text-[13px] font-medium cursor-pointer', inGroup(g) ? 'border-brand-600 text-brand-700' : 'border-transparent hover:text-slate-950')}>
                  {g.label} <ChevronDown size={13} className={cx('transition', menu === gi && 'rotate-180')} />
                </button>
                {menu === gi && (
                  <div className="absolute left-0 top-full z-40 mt-px w-60 rounded-b border border-t-0 border-slate-200 bg-white py-1.5 shadow-xl animate-pop">
                    {g.items.map((n) => (
                      <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('flex items-center gap-3 px-4 py-2 text-[13px]', isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50')}>
                        <n.icon size={15} className="text-slate-400" />
                        <span className="flex-1">{n.label}</span>
                        {n.badge ? <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">{n.badge}</span> : null}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </nav>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white animate-slide-left">
            <div className="flex h-12 items-center justify-between bg-brand-950 px-4 text-white"><span className="text-sm font-semibold">{brand.name}</span><button onClick={() => setDrawer(false)} aria-label="Close menu" className="cursor-pointer"><X size={18} /></button></div>
            {groups.map((g, gi) => (
              <div key={gi} className="border-b border-slate-100 py-2">
                {g.label && <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{g.label}</div>}
                {(g.single ? [g.single] : g.items).map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex items-center gap-3 px-4 py-2 text-sm', isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700')}>
                    <n.icon size={16} /> {n.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white px-6 py-2.5 text-[11px] text-slate-400">{brand.name} · {brand.tagline} · Demo environment — data is stored in your browser</footer>
    </div>
  );
}

/** Centered enterprise sign-in card. */
export function Login({ brand, highlights = [], demoEmail }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoEmail);
  const [pw, setPw] = useState('demo1234');
  const Logo = brand.icon;
  const go = (e) => { e?.preventDefault(); sessionStorage.setItem(brand.sessionKey, '1'); navigate(brand.base || '/'); };
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="absolute inset-x-0 top-0 h-[46vh] bg-brand-950" />
      <div className="absolute inset-x-0 top-0 h-[46vh] opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-500"><Logo size={20} /></span>
          <div><div className="text-lg font-semibold">{brand.name}</div><div className="text-xs text-white/60">Enterprise Resource Planning</div></div>
        </div>
        <form onSubmit={go} className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-2xl">
          <h1 className="text-lg font-semibold text-slate-900">Sign in to your workspace</h1>
          <p className="mt-1 text-xs text-slate-500">{brand.tagline}</p>
          <div className="mt-6 space-y-4">
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Work email</span><input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Password</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" /></label>
            <button className="h-10 w-full rounded bg-brand-700 text-sm font-semibold text-white hover:bg-brand-800 cursor-pointer">Sign in</button>
            <button type="button" onClick={go} className="h-10 w-full rounded border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Continue as demo administrator</button>
          </div>
          <p className="mt-6 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">Demo environment. Data is stored only in your browser — create, edit and delete freely. Use “Reset demo data” in the user menu to start over.</p>
        </form>
        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {highlights.map((h) => <div key={h} className="rounded border border-slate-200 bg-white px-3 py-2.5 text-center text-[11px] text-slate-600 shadow-sm">{h}</div>)}
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ sessionKey, base = '', children }) {
  const navigate = useNavigate();
  const ok = sessionStorage.getItem(sessionKey);
  useEffect(() => { if (!ok) navigate(`${base}/login`, { replace: true }); }, [ok, navigate, base]);
  return ok ? children : null;
}
