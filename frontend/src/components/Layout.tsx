import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-brand-500/30">
            DS
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            DocSign
          </span>
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
