import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/notificationService';
import { connectSocket } from '../../services/socketService';
import { getApiError } from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const dropdownRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationService.unreadCount();
      setUnread(res?.data?.count ?? 0);
    } catch {
      // ignore — bell badge is best-effort
    }
  }, []);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await notificationService.list({ page, limit: 20 });
        const data = res?.data ?? res;
        setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setPagination(data.pagination ?? { page: 1, total: 0 });
        setUnread(0);
      } catch (error) {
        toast.error(getApiError(error, 'Failed to load notifications'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      load(1);
    }
  }, [open, load]);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    const onNew = () => {
      refreshCount();
    };
    const onRefresh = () => {
      if (open) load(1);
    };

    socket.on('notifications:new', onNew);
    socket.on('notifications:refetch', onRefresh);
    return () => {
      socket.off('notifications:new', onNew);
      socket.off('notifications:refetch', onRefresh);
    };
  }, [open, load, refreshCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch (error) {
      toast.error(getApiError(error, 'Failed to mark notification read'));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnread(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to mark all notifications read'));
    }
  };

  const clearRead = async () => {
    try {
      await notificationService.clearRead();
      setItems((prev) => prev.filter((n) => !n.readAt));
      toast.success('Read notifications cleared');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to clear notifications'));
    }
  };

  const loadMore = () => {
    if (items.length < pagination.total) {
      load(pagination.page + 1);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('layout.notifications')}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{t('layout.notifications')}</h3>
              {unread > 0 && (
                <span className="text-xs bg-primary-50 text-primary-700 font-medium px-2 py-0.5 rounded-full">
                  {t('layout.newCount', { count: unread })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                title={t('layout.markAllRead')}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={clearRead}
                title={t('layout.clearRead')}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">{t('layout.loadingNotifications')}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">{t('layout.noNotifications')}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => markRead(item.id)}
                  className={`w-full text-left px-5 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    item.readAt ? '' : 'bg-primary-50/40'
                  }`}
                >
                  <p className={`text-sm ${item.readAt ? 'text-slate-500' : 'text-slate-900 font-medium'}`}>
                    {item.title || 'Notification'}
                  </p>
                  {item.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.message}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ''}
                  </p>
                </button>
              ))
            )}
          </div>

          {items.length < pagination.total && (
            <button
              onClick={loadMore}
              className="w-full py-2.5 text-sm text-primary-600 hover:bg-primary-50 font-medium transition-colors"
            >
              {t('layout.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;