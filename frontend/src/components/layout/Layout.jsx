import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import {
  LayoutDashboard,
  Map,
  Calendar,
  CalendarDays,
  Wallet,
  Ban,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { offlineQueue } from '../../utils/offlineQueue';
import NotificationBell from './NotificationBell';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-primary-50 text-primary-700 font-medium'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="flex-1">{label}</span>
    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
  </NavLink>
);

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      offlineQueue.processQueue().then((synced) => {
        if (synced > 0) toast.success(t('layout.syncComplete', { count: synced }));
      });
    }
  }, [isOnline]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — server session may already be invalid
    }
    dispatch(logout());
    navigate('/login');
    toast.success(t('layout.loggedOut'));
  };

  const navItems = [
    { to: '/app', icon: LayoutDashboard, label: t('layout.dashboard'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/app/resources', icon: Map, label: t('layout.resources'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/app/slots', icon: Calendar, label: t('layout.slots'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/app/bookings', icon: CalendarDays, label: t('layout.bookings'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/app/payments', icon: Wallet, label: t('layout.payments'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/app/blacklist', icon: Ban, label: t('layout.blacklist'), roles: ['facility_owner', 'manager'] },
    { to: '/app/settings', icon: Settings, label: t('layout.settings'), roles: ['facility_owner', 'manager', 'operator'] },
    { to: '/admin', icon: Shield, label: t('layout.admin'), roles: ['platform_admin'] },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-white border-r border-slate-200 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
        }`}
      >
        <div className="h-full flex flex-col w-64">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900">TurfBook</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <SidebarItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">
                  {user?.firstName?.[0] || ''}
                  {user?.lastName?.[0] || ''}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('layout.logout')}
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-6 py-2 flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            {t('layout.offline')}
          </div>
        )}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <span className="hidden md:inline text-sm text-slate-500">
                {t('layout.welcomeBack', { name: user?.firstName || 'there' })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;