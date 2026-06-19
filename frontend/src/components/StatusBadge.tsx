import { Link } from 'react-router-dom';

interface StatusBadgeProps {
  status: 'pending' | 'signed' | 'rejected';
}

const styles = {
  pending: 'bg-amber-100 text-amber-800',
  signed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
            DS
          </div>
          <h1 className="mt-8 text-3xl font-bold">Document Signature App</h1>
          <p className="mt-4 max-w-md text-brand-100">
            Secure digital signatures with full audit trails. Upload, sign, and share documents — enterprise-grade workflows made simple.
          </p>
        </div>
        <p className="text-sm text-brand-200">Legally traceable · Tamper-evident · Audit-ready</p>
      </div>
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-slate-500 lg:hidden">
            <Link to="/" className="text-brand-600 hover:underline">
              DocSign
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
