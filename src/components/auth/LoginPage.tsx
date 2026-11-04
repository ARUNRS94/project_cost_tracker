import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Moon,
  Sun,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { users, login, themeMode, toggleThemeMode } = useERP();
  const [email, setEmail] = useState<string>(users[0]?.email || 'ramesh@projectcode.com');
  const [password, setPassword] = useState<string>('••••••••');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail) || users[0];

    if (!user) {
      setErrorMsg('No user account found. Please check your credentials.');
      return;
    }

    login(user);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[var(--bg)] text-[var(--text)] transition-colors">
      {/* Top Bar with Brand & Theme Toggle */}
      <div className="max-w-[1180px] w-full mx-auto flex items-center justify-between pb-4 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-semibold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display font-medium text-lg tracking-tight text-[var(--text)]">
              Project Code Tracker
            </h1>
          </div>
        </div>

        <button
          onClick={toggleThemeMode}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
          title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#C9A66B]" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#A88243]" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Main Authentication Container */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 sm:p-8 shadow-xl relative">
          <div className="text-center mb-6">
            <span className="badge-accent font-mono text-[10px] px-2.5 py-1 rounded font-semibold uppercase tracking-wider inline-block mb-2">
              Authentication Portal
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-normal text-[var(--text)]">
              Sign In
            </h2>
            <p className="text-xs text-[var(--text-dim)] mt-1.5 max-w-xs mx-auto">
              Enter your corporate credentials to access projects, expenses, vendor ledgers, and quotations.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs text-center font-mono">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[var(--text-dim)] mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono text-[var(--text-dim)]">Password</label>
                <span className="text-[11px] font-mono text-[var(--text-faint)]">Secure</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)] hover:text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 bg-[var(--bg)]"
                />
                <span className="text-[11px] font-mono">Remember session</span>
              </label>
              <span className="text-[11px] font-mono text-[var(--accent)]">
                Offline-First
              </span>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded font-semibold text-xs bg-[var(--accent)] hover:opacity-90 text-[#1E1B18] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Sign In to Project Code Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-[var(--text-faint)] font-mono text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Role-Based Access Control · Secure Session Active</span>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="max-w-[1180px] w-full mx-auto text-center py-4 border-t border-[var(--border-soft)] text-[11px] font-mono text-[var(--text-faint)]">
        Project Code Tracker · Standard Rupee (₹) Operating Ledger
      </footer>
    </div>
  );
};
