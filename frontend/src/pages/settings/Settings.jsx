import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Save, Bell, Globe, Shield, Palette, CreditCard, Check, Gauge, Smartphone, Building2, Landmark, FileText, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile } from '../../store/slices/authSlice';
import { getSubscription, createCheckoutSession } from '../../store/slices/organizationSlice';
import { subscriptionService } from '../../services/subscriptionService';
import { settingsService } from '../../services/settingsService';
import { Button } from '../../components/ui';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getApiError } from '../../utils/api';
import { formatBDT } from '../../utils/format';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, fields: 3, features: ['Up to 3 fields', 'Monthly inspections', 'Basic reports'] },
  { id: 'pro', name: 'Pro', price: 2500, fields: 15, features: ['Up to 15 fields', 'Unlimited inspections', 'Photo documentation', 'Priority support'] },
  { id: 'enterprise', name: 'Enterprise', price: 8000, fields: 'Unlimited', features: ['Unlimited fields', 'Multi-user roles', 'API access', 'Dedicated support'] },
];

const PAYMENT_METHODS = [
  { id: 'sslcommerz', nameKey: 'settings.subscription.sslcommerz', hintKey: 'settings.subscription.sslcommerzHint', icon: Landmark },
  { id: 'bkash', nameKey: 'settings.subscription.bkash', hintKey: 'settings.subscription.bkashHint', icon: Smartphone },
  { id: 'nagad', nameKey: 'settings.subscription.nagad', hintKey: 'settings.subscription.nagadHint', icon: Building2 },
];

const DEFAULT_WEIGHTS = {
  surface: 20,
  soil: 20,
  structural: 20,
  grass: 20,
  maintenance: 15,
};

const WEIGHT_FIELDS = [
  { key: 'surface', label: 'Surface condition', hint: 'Grass cover, color uniformity, weeds, pests, disease' },
  { key: 'soil', label: 'Soil condition', hint: 'Compaction, pH balance, moisture content' },
  { key: 'structural', label: 'Structural condition', hint: 'Evenness, drainage rate, thatch depth' },
  { key: 'grass', label: 'Grass health', hint: 'Color, disease and pest ratings' },
  { key: 'maintenance', label: 'Maintenance credit', hint: 'Fixed credit for ongoing upkeep' },
];

const Settings = () => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { subscription, loading: subLoading } = useSelector((state) => state.organizations);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('sslcommerz');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    inApp: true,
    sms: false,
  });
  const [appearance, setAppearance] = useState(() => localStorage.getItem('appearance') || 'light');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [timezone, setTimezone] = useState('Asia/Dhaka');

  const handleLanguageChange = (lng) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    document.documentElement.lang = lng;
  };
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ frequency: 'weekly', recipients: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== 'org_admin') return;
    let cancelled = false;
    setSchedulesLoading(true);
    settingsService
      .listReportSchedules()
      .then((result) => {
        if (!cancelled) setSchedules(result?.data?.schedules || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSchedulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === 'org_admin') {
      dispatch(getSubscription());
    }
  }, [dispatch, user?.role]);

  useEffect(() => {
    if (user?.role !== 'org_admin') return;
    let cancelled = false;
    setWeightsLoading(true);
    settingsService
      .getOrganizationSettings()
      .then((result) => {
        if (cancelled) return;
        const saved = result?.data?.settings?.scoringWeights;
        if (saved && Object.keys(saved).length > 0) {
          setWeights({ ...DEFAULT_WEIGHTS, ...saved });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setWeightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const saveWeights = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const field of WEIGHT_FIELDS) {
        payload[field.key] = Number(weights[field.key]);
      }
      await settingsService.updateOrganizationSettings({ scoringWeights: payload });
      toast.success('Scoring weights updated');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update scoring weights'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = await dispatch(
        updateProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
        })
      ).unwrap();
      toast.success('Profile updated');
      if (payload?.user) {
        setFormData({
          firstName: payload.user.firstName || '',
          lastName: payload.user.lastName || '',
          email: payload.user.email || '',
          phone: payload.user.phone || '',
        });
      }
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const saveReportSchedule = async (e) => {
    e.preventDefault();
    setScheduleSaving(true);
    try {
      const recipients = scheduleForm.recipients
        .split(/[\s,;]+/)
        .map((r) => r.trim())
        .filter(Boolean);
      const result = await settingsService.createReportSchedule({
        frequency: scheduleForm.frequency,
        recipients,
      });
      toast.success('Report schedule created');
      setSchedules((prev) => [...prev, result?.data?.schedule]);
      setScheduleForm({ frequency: 'weekly', recipients: '' });
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create schedule'));
    } finally {
      setScheduleSaving(false);
    }
  };

  const toggleSchedule = async (schedule) => {
    try {
      const result = await settingsService.updateReportSchedule(schedule.id, {
        frequency: schedule.frequency,
        recipients: schedule.recipients,
        enabled: !schedule.enabled,
      });
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? result?.data?.schedule || { ...s, enabled: !s.enabled } : s))
      );
      toast.success(schedule.enabled ? 'Report schedule paused' : 'Report schedule resumed');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update schedule'));
    }
  };

  const deleteSchedule = async (schedule) => {
    try {
      await settingsService.deleteReportSchedule(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      toast.success('Report schedule deleted');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete schedule'));
    }
  };

  const setAppearancePref = (theme) => {
    setAppearance(theme);
    localStorage.setItem('appearance', theme);
    toast.success(`Theme set to ${theme}`);
  };

  const upgrade = async (planId) => {
    setUpgrading(true);
    try {
      if (planId === 'free') {
        await dispatch(updateSubscription({ planId })).unwrap();
        toast.success(`Switched to Free plan`);
        return;
      }

      let session;
      if (paymentMethod === 'bkash') {
        session = await subscriptionService.createBkashCheckout(planId);
      } else if (paymentMethod === 'nagad') {
        session = await subscriptionService.createNagadCheckout(planId);
      } else {
        session = await dispatch(createCheckoutSession(planId)).unwrap();
      }

      const url = session?.bkashURL || session?.nagadURL || session?.checkoutUrl;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Checkout URL not received');
      }
    } catch (error) {
      toast.error(getApiError(error, 'Failed to start checkout'));
    } finally {
      setUpgrading(false);
    }
  };

  const TABS = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: Shield },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'language', label: t('settings.tabs.language'), icon: Globe },
    ...(user?.role === 'org_admin'
      ? [
          { id: 'scoring', label: t('settings.tabs.scoring'), icon: Gauge },
          { id: 'reports', label: t('settings.tabs.reports'), icon: FileText },
          { id: 'subscription', label: t('settings.tabs.subscription'), icon: CreditCard },
        ]
      : []),
  ];

  const currentPlanId = subscription?.plan || subscription?.tier || 'free';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="+8801XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                { key: 'inApp', label: 'In-App Notifications', description: 'Show notifications in the app' },
                { key: 'sms', label: 'SMS Alerts', description: 'Receive urgent alerts via SMS' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-900">{pref.label}</p>
                    <p className="text-sm text-slate-500">{pref.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[pref.key]}
                      onChange={(e) => setNotifications({ ...notifications, [pref.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900">Appearance</h3>
              <div className="grid grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setAppearancePref(theme)}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      appearance === theme ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-full h-20 rounded-lg mb-2 border ${
                        theme === 'light' ? 'bg-white border-slate-200' : theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-800 border-slate-200'
                      }`}
                    />
                    <span className={`text-sm font-medium capitalize ${appearance === theme ? 'text-primary-700' : 'text-slate-600'}`}>
                      {theme}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900">{t('settings.language.title')}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('settings.language.language')}
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="en">{t('settings.language.english')}</option>
                    <option value="bn">{t('settings.language.bangla')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="timezone-select" className="block text-sm font-medium text-slate-700 mb-2">
                    {t('settings.language.timezone')}
                  </label>
                  <select
                    id="timezone-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => toast.success(t('settings.language.preferencesSaved'))}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('settings.language.savePreferences')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pitch Quality Score Weights</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Weight each category from 0 to 20. Weights only apply to new inspections — existing scores are
                  unchanged.
                </p>
              </div>
              {weightsLoading ? (
                <LoadingSpinner text="Loading scoring settings…" />
              ) : (
                <>
                  <div className="space-y-4">
                    {WEIGHT_FIELDS.map((field) => (
                      <div key={field.key} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{field.label}</p>
                            <p className="text-sm text-slate-500">{field.hint}</p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={weights[field.key]}
                            onChange={(e) =>
                              setWeights({ ...weights, [field.key]: e.target.value })
                            }
                            className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" onClick={saveWeights} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Scoring Weights
                  </Button>
                </>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Scheduled Reports</h3>
                <p className="text-sm text-slate-500 mt-1">
                  TurfCare BD emails an analytics summary on a regular schedule. Add up to one schedule per
                  frequency.
                </p>
              </div>

              <form onSubmit={saveReportSchedule} className="p-5 bg-slate-50 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="schedule-frequency" className="block text-sm font-medium text-slate-700 mb-2">
                      Frequency
                    </label>
                    <select
                      id="schedule-frequency"
                      value={scheduleForm.frequency}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="schedule-recipients" className="block text-sm font-medium text-slate-700 mb-2">
                      Recipient emails
                    </label>
                    <input
                      id="schedule-recipients"
                      type="text"
                      value={scheduleForm.recipients}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                      placeholder="manager@club.com, owner@club.com"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                <Button type="submit" loading={scheduleSaving}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
              </form>

              {schedulesLoading ? (
                <LoadingSpinner text="Loading report schedules…" />
              ) : schedules.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-xl border border-slate-100">
                  No report schedules yet. Create one above to start receiving email reports.
                </p>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-100 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 capitalize">{schedule.frequency} report</p>
                        <p className="text-sm text-slate-500 truncate">
                          {(schedule.recipients || []).join(', ')}
                        </p>
                        {schedule.lastRunAt && (
                          <p className="text-xs text-slate-400 mt-1">
                            Last sent {new Date(schedule.lastRunAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSchedule(schedule)}
                          aria-label={`${schedule.enabled ? 'Pause' : 'Resume'} schedule`}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            schedule.enabled
                              ? 'bg-success-50 text-success-600 hover:bg-success-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {schedule.enabled ? 'Active' : 'Paused'}
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule)}
                          aria-label="Delete schedule"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6 max-w-4xl">
              {subLoading && !subscription ? (
                <LoadingSpinner text="Loading subscription…" />
              ) : (
                <>
                  {subscription?.status === 'past_due' && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                      <p className="font-semibold">Payment overdue</p>
                      <p className="text-sm mt-1">
                        Your subscription will be downgraded to the Free plan at the end of the grace period
                        {subscription.gracePeriodEnd
                          ? ` (${new Date(subscription.gracePeriodEnd).toLocaleDateString()})`
                          : ''}{' '}
                        unless payment is completed.
                      </p>
                    </div>
                  )}
                  {subscription?.status === 'downgraded' && (
                    <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                      <p className="font-semibold">Downgraded to Free</p>
                      <p className="text-sm mt-1">
                        The previous plan expired without renewal. Upgrade any time to restore features.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-5">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Current plan:{' '}
                        <span className="text-primary-600 capitalize">{currentPlanId}</span>
                      </p>
                      {subscription?.renewalDate && (
                        <p className="text-sm text-slate-500 mt-1">
                          Renews on {new Date(subscription.renewalDate).toLocaleDateString()}
                        </p>
                      )}
                      {subscription?.fieldsLimit != null && (
                        <p className="text-sm text-slate-500 mt-1">
                          {subscription.fieldsUsed ?? 0} of {subscription.fieldsLimit} fields in use
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">{t('settings.subscription.paymentMethod')}</h4>
                    <p className="text-xs text-slate-500 mb-3">
                      {t('settings.subscription.paymentMethodHint')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          aria-pressed={isSelected}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <method.icon
                              className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`}
                            />
                            <div>
                              <p className={`font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                                {t(method.nameKey)}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{t(method.hintKey)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                      const isCurrent = plan.id === currentPlanId;
                      return (
                        <div
                          key={plan.id}
                          className={`rounded-2xl border-2 p-6 flex flex-col ${
                            isCurrent ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {plan.price === 0 ? 'Free' : formatBDT(plan.price)}
                            {plan.price > 0 && <span className="text-sm font-normal text-slate-500">/month</span>}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">{plan.fields} fields included</p>
                          <ul className="mt-4 space-y-2 flex-1">
                            {plan.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                                <Check className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-6">
                            {isCurrent ? (
                              <span className="w-full inline-flex justify-center px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium">
                                Current Plan
                              </span>
                            ) : (
                              <Button
                                variant={plan.id === 'enterprise' ? 'primary' : 'secondary'}
                                fullWidth
                                loading={upgrading}
                                onClick={() => upgrade(plan.id)}
                              >
                                Switch to {plan.name}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;