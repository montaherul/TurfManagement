import { Outlet, Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

const PublicLayout = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">TurfBook</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">
            Login
          </Link>
          <Link
            to="/apply"
            className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors"
          >
            List your facility
          </Link>
        </nav>
      </div>
    </header>
    <main className="flex-1">
      <Outlet />
    </main>
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-slate-500">
        TurfBook BD — book turfs, courts &amp; arenas in Bangladesh
      </div>
    </footer>
  </div>
);

export default PublicLayout;