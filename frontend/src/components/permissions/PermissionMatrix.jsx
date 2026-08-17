import { useEffect, useMemo, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { Button } from '../ui';

/**
 * Reusable role x action permission matrix editor.
 * props: {
 *   roles:      [{ role, actions }]   current effective actions per role
 *   groups:     { groupName: [{action,label,group}] } catalog grouped
 *   lockedRoles: ['super_admin']      roles rendered but not editable
 *   scopeLabel: 'Platform' | org name used in the header
 *   onSave:     (role, actions) => Promise
 * }
 */
const PermissionMatrix = ({ roles, groups, lockedRoles = [], scopeLabel = '', onSave }) => {
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      (roles || []).forEach((r) => {
        if (!next[r.role]) next[r.role] = new Set(r.actions || []);
      });
      return next;
    });
  }, [roles]);

  const groupEntries = useMemo(() => Object.entries(groups || {}), [groups]);

  const toggle = (role, action) => {
    setDrafts((prev) => {
      const next = new Set(prev[role] || []);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return { ...prev, [role]: next };
    });
  };

  const toggleGroup = (role, groupActions) => {
    setDrafts((prev) => {
      const next = new Set(prev[role] || []);
      const allSelected = groupActions.every((a) => next.has(a));
      groupActions.forEach((a) => (allSelected ? next.delete(a) : next.add(a)));
      return { ...prev, [role]: next };
    });
  };

  const isDirty = (role) => {
    const base = roles.find((r) => r.role === role);
    if (!base) return false;
    const draft = drafts[role];
    if (!draft) return false;
    if (draft.size !== base.actions.length) return true;
    return base.actions.some((a) => !draft.has(a));
  };

  const handleSave = async (role) => {
    try {
      await onSave(role, [...(drafts[role] || [])].sort());
    } catch (e) {
      /* toast handled by caller */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ShieldCheck className="w-4 h-4 text-primary-600" />
          Role permissions {scopeLabel ? <span className="text-slate-400">— {scopeLabel}</span> : null}
        </div>
      </div>

      {(roles || []).map((role) => {
        const locked = lockedRoles.includes(role.role);
        const draft = drafts[role.role];
        return (
          <div key={role.role} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-900 capitalize">{role.role.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500">
                  {locked ? 'Always has full access' : `${draft?.size || 0} of ${Object.keys(groups || {}).length ? Object.values(groups).flat().length : 0} permissions`}
                </p>
              </div>
              {!locked && isDirty(role.role) && (
                <Button size="sm" onClick={() => handleSave(role.role)}>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </Button>
              )}
              {locked && (
                <span className="text-xs font-medium text-slate-400 px-2.5 py-1 bg-slate-100 rounded-full">Locked</span>
              )}
            </div>
            <div className="p-5 space-y-5">
              {groupEntries.map(([group, actions]) => {
                const allSelected = actions.every((a) => draft?.has(a.action));
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => toggleGroup(role.role, actions.map((a) => a.action))}
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-primary-600 disabled:cursor-not-allowed"
                      >
                        {group}
                      </button>
                      {!locked && (
                        <span className="text-xs text-slate-400">{allSelected ? 'All selected — click to clear' : ''}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {actions.map((perm) => (
                        <label
                          key={perm.action}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                            locked
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : draft?.has(perm.action)
                                ? 'border-primary-200 bg-primary-50 text-slate-800'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            checked={locked || !!draft?.has(perm.action)}
                            disabled={locked}
                            onChange={() => toggle(role.role, perm.action)}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;