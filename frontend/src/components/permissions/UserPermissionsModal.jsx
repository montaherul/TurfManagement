import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal, Button } from '../ui';
import LoadingSpinner from '../ui/LoadingSpinner';

const TRI_STATE = { default: 'default', allow: 'allow', deny: 'deny' };

/**
 * Reusable per-user permission override editor (Default / Allow / Deny).
 * props: {
 *   open, onClose, user, groups,
 *   overrides: { allowed: [], denied: [] },
 *   saving, loading, onSave: (allowed, denied) => Promise
 * }
 */
const UserPermissionsModal = ({ open, onClose, user, groups, overrides, saving, loading, onSave }) => {
  const [values, setValues] = useState({});

  const groupEntries = useMemo(() => Object.entries(groups || {}), [groups]);

  const allowedSet = useMemo(() => new Set(overrides?.allowed || []), [overrides]);
  const deniedSet = useMemo(() => new Set(overrides?.denied || []), [overrides]);

  const getValue = (action) => values[action] ?? (deniedSet.has(action) ? TRI_STATE.deny : allowedSet.has(action) ? TRI_STATE.allow : TRI_STATE.default);

  const setValue = (action, value) => setValues((prev) => ({ ...prev, [action]: value }));

  const dirty = useMemo(() => {
    const next = Object.entries(values);
    if (!next.length) return false;
    return next.some(([action, value]) => {
      const current = deniedSet.has(action) ? TRI_STATE.deny : allowedSet.has(action) ? TRI_STATE.allow : TRI_STATE.default;
      return value !== current;
    });
  }, [values, allowedSet, deniedSet]);

  const handleSave = () => {
    const allowed = [];
    const denied = [];
    Object.entries(values).forEach(([action, value]) => {
      if (value === TRI_STATE.allow) allowed.push(action);
      if (value === TRI_STATE.deny) denied.push(action);
    });
    onSave(allowed, denied);
  };

  const optionStyles = {
    default: 'border-slate-200 text-slate-600 hover:border-slate-300',
    allow: 'border-green-200 bg-green-50 text-green-700',
    deny: 'border-red-200 bg-red-50 text-red-700',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Permissions — ${user.name || user.email || 'User'}` : 'Permissions'}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!dirty}>
            <Save className="w-4 h-4 mr-1.5" />
            Save Overrides
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingSpinner text="Loading user permissions…" />
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">
            Grant or block specific actions for this user. <span className="font-medium text-slate-700">Default</span>{' '}
            means the user's role permissions apply.
          </p>
        {groupEntries.map(([group, actions]) => (
          <div key={group}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map((perm) => (
                <div key={perm.action} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-700">{perm.label}</span>
                  <div className="flex items-center gap-1">
                    {['default', 'allow', 'deny'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setValue(perm.action, option)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${optionStyles[option]} ${
                          getValue(perm.action) === option ? optionStyles[option] : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {option === 'default' ? 'Default' : option === 'allow' ? 'Allow' : 'Deny'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      )}
    </Modal>
  );
};

export default UserPermissionsModal;