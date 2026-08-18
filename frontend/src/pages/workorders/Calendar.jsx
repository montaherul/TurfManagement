import { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Wrench, MapPin, User, Clock, AlertCircle } from 'lucide-react';
import { getCalendar } from '../../store/slices/workOrderSlice';
import { usePermissions } from '../../hooks/usePermissions';
import { titleCase } from '../../utils/format';

const STATUS_COLORS = {
  created: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-success-100 text-success-700',
  verified: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS = {
  urgent: 'text-red-600',
  high: 'text-amber-600',
  medium: 'text-blue-600',
  low: 'text-slate-500',
};

const Calendar = () => {
  const dispatch = useDispatch();
  const { can } = usePermissions();
  const { workOrders, loading, error } = useSelector((state) => state.workOrders);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDay = format(monthStart, 'E');
  const startDayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(startDay);

  const calendarDays = useMemo(() => {
    const result = [];
    for (let i = 0; i < startDayIndex; i++) {
      result.push(null);
    }
    days.forEach((day) => {
      result.push(day);
    });
    return result;
  }, [startDayIndex, days]);

  const workOrdersByDate = useMemo(() => {
    const map = new Map();
    (workOrders || []).forEach((wo) => {
      if (!wo.dueDate) return;
      const key = format(new Date(wo.dueDate), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(wo);
    });
    return map;
  }, [workOrders]);

  const selectedDateWorkOrders = useMemo(() => {
    const key = format(currentMonth, 'yyyy-MM-dd');
    return workOrdersByDate.get(key) || [];
  }, [currentMonth, workOrdersByDate]);

  useEffect(() => {
    dispatch(
      getCalendar({
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear(),
      })
    );
  }, [dispatch, currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (loading && !workOrders.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance Calendar</h1>
          <p className="text-slate-500 mt-1">Work orders scheduled by due date</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} aria-label="Previous month" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} aria-label="Next month" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = day ? format(day, 'yyyy-MM-dd') : `empty-${idx}`;
              const dayWorkOrders = day ? workOrdersByDate.get(key) || [] : [];
              const isToday = day && isSameDay(day, new Date());
              const isCurrentMonth = day && isSameMonth(day, currentMonth);

              return (
                <div
                  key={key}
                  className={`min-h-[100px] p-2 border-b border-r border-slate-100 ${
                    isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayWorkOrders.slice(0, 3).map((wo) => (
                          <div
                            key={wo.id}
                            className={`text-xs px-1.5 py-0.5 rounded-md truncate ${STATUS_COLORS[wo.status] || 'bg-slate-100 text-slate-700'}`}
                            title={`${wo.workOrderId} - ${wo.title}`}
                          >
                            {wo.workOrderId}
                          </div>
                        ))}
                        {dayWorkOrders.length > 3 && (
                          <div className="text-xs text-slate-400 pl-1">+{dayWorkOrders.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {format(currentMonth, 'MMMM d')} Work Orders
          </h3>
          {selectedDateWorkOrders.length === 0 ? (
            <p className="text-sm text-slate-400">No work orders scheduled for this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateWorkOrders.map((wo) => (
                <div key={wo.id} className="p-3 rounded-xl border border-slate-200 hover:border-primary-200 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-500">{wo.workOrderId}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[wo.status] || 'bg-slate-100 text-slate-700'}`}>
                      {titleCase(wo.status)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">{wo.title}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {wo.field && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {wo.field.name}
                      </span>
                    )}
                    {wo.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {wo.assignee.firstName} {wo.assignee.lastName}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 ${PRIORITY_COLORS[wo.priority] || 'text-slate-500'}`}>
                      <AlertCircle className="w-3 h-3" />
                      {titleCase(wo.priority)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
