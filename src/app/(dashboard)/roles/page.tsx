"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  X,
  Trash2,
  Loader2,
  Edit2,
  Users,
  Key,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Eye,
  Search,
  CheckSquare,
  Sparkles,
  Lock,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CRUD_ACTIONS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_GROUPS,
  hasModuleAction,
  getModulePermissionSummary,
  type CrudAction,
} from '@/lib/permissions';
import { usePermissions } from '@/context/PermissionContext';
import { ReadOnlyNotice } from '@/components/PermissionGuard';

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function RolesAndUsersPage() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Roles State
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [savingRole, setSavingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState<any>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>(Object.keys(PERMISSION_MODULE_GROUPS));
  const [permissionSearch, setPermissionSearch] = useState('');
  const [detailRole, setDetailRole] = useState<any | null>(null);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    isActive: true,
  });
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userError, setUserError] = useState('');

  // Password Reset State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const r = await fetch('/api/roles');
      const d = await r.json();
      if (d.success) setRoles(d.roles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const r = await fetch('/api/users?limit=100');
      const d = await r.json();
      if (d.success) setUsers(d.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers();
  }, [activeTab, fetchUsers]);

  const toggleGroup = (group: string) =>
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );

  // ── Granular CRUD Toggle Logic ─────────────────────────────────────────────
  const toggleAction = (moduleId: string, action: CrudAction) => {
    setRoleForm((prev) => {
      let current = [...prev.permissions];
      const isCurrentlyChecked = hasModuleAction(current, moduleId, action);

      if (action === 'read') {
        if (isCurrentlyChecked) {
          // Deselecting read removes all actions for this module
          current = current.filter(
            (p) =>
              p !== moduleId &&
              p !== `${moduleId}:read` &&
              p !== `${moduleId}:create` &&
              p !== `${moduleId}:update` &&
              p !== `${moduleId}:delete`
          );
        } else {
          // Selecting read adds read and moduleId
          if (!current.includes(moduleId)) current.push(moduleId);
          if (!current.includes(`${moduleId}:read`)) current.push(`${moduleId}:read`);
        }
      } else {
        const actionKey = `${moduleId}:${action}`;
        if (isCurrentlyChecked) {
          current = current.filter((p) => p !== actionKey);
        } else {
          // Selecting Create, Update, or Delete automatically enables Read
          if (!current.includes(moduleId)) current.push(moduleId);
          if (!current.includes(`${moduleId}:read`)) current.push(`${moduleId}:read`);
          if (!current.includes(actionKey)) current.push(actionKey);
        }
      }
      return { ...prev, permissions: current };
    });
  };

  const toggleModuleFull = (moduleId: string) => {
    setRoleForm((prev) => {
      const summary = getModulePermissionSummary(prev.permissions, moduleId);
      let current = prev.permissions.filter(
        (p) =>
          p !== moduleId &&
          p !== `${moduleId}:read` &&
          p !== `${moduleId}:create` &&
          p !== `${moduleId}:update` &&
          p !== `${moduleId}:delete`
      );
      if (!summary.isFull) {
        current.push(
          moduleId,
          `${moduleId}:read`,
          `${moduleId}:create`,
          `${moduleId}:update`,
          `${moduleId}:delete`
        );
      }
      return { ...prev, permissions: current };
    });
  };

  const toggleModuleReadOnly = (moduleId: string) => {
    setRoleForm((prev) => {
      let current = prev.permissions.filter(
        (p) =>
          p !== moduleId &&
          p !== `${moduleId}:read` &&
          p !== `${moduleId}:create` &&
          p !== `${moduleId}:update` &&
          p !== `${moduleId}:delete`
      );
      current.push(moduleId, `${moduleId}:read`);
      return { ...prev, permissions: current };
    });
  };

  // Group quick actions
  const setGroupFull = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupModules = PERMISSION_MODULE_GROUPS[groupName] || [];
    setRoleForm((prev) => {
      let current = [...prev.permissions];
      for (const m of groupModules) {
        current = current.filter(
          (p) =>
            p !== m.id &&
            p !== `${m.id}:read` &&
            p !== `${m.id}:create` &&
            p !== `${m.id}:update` &&
            p !== `${m.id}:delete`
        );
        current.push(m.id, `${m.id}:read`, `${m.id}:create`, `${m.id}:update`, `${m.id}:delete`);
      }
      return { ...prev, permissions: Array.from(new Set(current)) };
    });
  };

  const setGroupReadOnly = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupModules = PERMISSION_MODULE_GROUPS[groupName] || [];
    setRoleForm((prev) => {
      let current = [...prev.permissions];
      for (const m of groupModules) {
        current = current.filter(
          (p) =>
            p !== m.id &&
            p !== `${m.id}:read` &&
            p !== `${m.id}:create` &&
            p !== `${m.id}:update` &&
            p !== `${m.id}:delete`
        );
        current.push(m.id, `${m.id}:read`);
      }
      return { ...prev, permissions: Array.from(new Set(current)) };
    });
  };

  const clearGroup = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupModules = PERMISSION_MODULE_GROUPS[groupName] || [];
    const groupIds = new Set(groupModules.map((m) => m.id));
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((p) => {
        const baseId = p.split(':')[0];
        return !groupIds.has(baseId) && !groupIds.has(p);
      }),
    }));
  };

  // Global Quick Actions
  const selectAllFullAccess = () => {
    const all: string[] = [];
    for (const m of PERMISSION_MODULES) {
      all.push(m.id, `${m.id}:read`, `${m.id}:create`, `${m.id}:update`, `${m.id}:delete`);
    }
    setRoleForm((prev) => ({ ...prev, permissions: all }));
  };

  const selectAllReadOnly = () => {
    const all: string[] = [];
    for (const m of PERMISSION_MODULES) {
      all.push(m.id, `${m.id}:read`);
    }
    setRoleForm((prev) => ({ ...prev, permissions: all }));
  };

  const clearAllPermissions = () => {
    setRoleForm((prev) => ({ ...prev, permissions: [] }));
  };

  // Filtered modules by search
  const filteredGroups = useMemo(() => {
    if (!permissionSearch.trim()) return PERMISSION_MODULE_GROUPS;
    const q = permissionSearch.toLowerCase();
    const result: Record<string, typeof PERMISSION_MODULES> = {};

    Object.entries(PERMISSION_MODULE_GROUPS).forEach(([group, modules]) => {
      const matched = modules.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          group.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        result[group] = matched;
      }
    });

    return result;
  }, [permissionSearch]);

  const handleEditRole = (role: any) => {
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setEditingRoleId(role._id);
    setRoleError('');
    setRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError('');
    if (!roleForm.name.trim()) {
      setRoleError('Role name is required.');
      return;
    }
    setSavingRole(true);
    try {
      const method = editingRoleId ? 'PUT' : 'POST';
      const body = editingRoleId ? { ...roleForm, _id: editingRoleId } : roleForm;
      const r = await fetch('/api/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setRoleModalOpen(false);
        setRoleForm({ name: '', description: '', permissions: [] });
        setEditingRoleId(null);
        fetchRoles();
        showToast(editingRoleId ? 'Role updated!' : 'Role created!');
      } else {
        setRoleError(d.message || 'Failed to save role.');
      }
    } catch {
      setRoleError('Network error. Please try again.');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    setDeletingRole(role._id);
    try {
      const r = await fetch(`/api/roles?id=${role._id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        fetchRoles();
        showToast(`Role "${role.name}" deleted.`);
      } else {
        showToast(d.message || 'Failed to delete role.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setDeletingRole(null);
    }
  };

  const handleEditUser = (user: any) => {
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive !== false,
    });
    setEditingUserId(user._id);
    setUserError('');
    setUserModalOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setSavingUser(true);
    try {
      const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
      const method = editingUserId ? 'PUT' : 'POST';
      const payload: any = { ...userForm };
      if (editingUserId && !payload.password) delete payload.password;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        setUserModalOpen(false);
        setUserForm({
          fullName: '',
          email: '',
          password: '',
          role: roles[0]?.name || 'admin',
          phone: '',
          isActive: true,
        });
        setEditingUserId(null);
        fetchUsers();
        fetchRoles();
        showToast(editingUserId ? 'User updated!' : 'User created!');
      } else {
        setUserError(d.message || 'Failed to save user.');
      }
    } catch {
      setUserError('Network error. Please try again.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Delete user "${user.fullName}"? This cannot be undone.`)) return;
    setDeletingUser(user._id);
    try {
      const r = await fetch(`/api/users/${user._id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        fetchUsers();
        fetchRoles();
        showToast(`User "${user.fullName}" deleted.`);
      } else {
        showToast(d.message || 'Failed to delete.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setDeletingUser(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || newPassword.length < 6) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${resetUserId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetModalOpen(false);
        setNewPassword('');
        showToast(`Password for ${resetUserName} reset!`);
      } else {
        showToast(data.message || 'Failed to reset.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Staff & Granular Roles
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Manage administrators, staff accounts, and granular CRUD (Create, Read-Only, Update, Delete) access permissions.
          </p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'roles'
                ? 'bg-[#0B1A45] text-white shadow-md'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" /> Roles
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTab === 'roles' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              {roles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'bg-[#0B1A45] text-white shadow-md'
                : 'text-gray-600 dark:text-slate-300 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" /> Users
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              {users.length}
            </span>
          </button>
        </div>
      </div>

      <ReadOnlyNotice module="roles-permissions" featureName="Role & Permission" className="mb-4" />

      {/* Top Action Bar */}
      {can('roles-permissions', 'create') && (
        <div className="flex justify-end mb-4">
          {activeTab === 'roles' ? (
            <button
              onClick={() => {
                setEditingRoleId(null);
                setRoleForm({ name: '', description: '', permissions: [] });
                setRoleError('');
                setRoleModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0B1A45] hover:bg-[#132B66] text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-[#0B1A45]/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Role with CRUD
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingUserId(null);
                setUserForm({
                  fullName: '',
                  email: '',
                  password: '',
                  role: roles[0]?.name || 'admin',
                  phone: '',
                  isActive: true,
                });
                setUserError('');
                setUserModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0B1A45] hover:bg-[#132B66] text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-[#0B1A45]/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Create User
            </button>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'roles' ? (
            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-900 dark:text-white font-medium border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Role Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">CRUD Permissions Overview</th>
                  <th className="px-6 py-4">Users</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loadingRoles ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                      <p className="text-gray-500 dark:text-slate-400 font-medium">No roles found.</p>
                      <p className="text-xs mt-1 text-gray-400">Click &quot;Create Role with CRUD&quot; to get started.</p>
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => {
                    const isWildcard = role.permissions?.includes('*');
                    const perms = role.permissions || [];

                    // Calculate module summaries
                    const activeModules = isWildcard
                      ? PERMISSION_MODULES
                      : PERMISSION_MODULES.filter((m) => {
                          const s = getModulePermissionSummary(perms, m.id);
                          return s.hasAny;
                        });

                    const fullCount = isWildcard
                      ? PERMISSION_MODULES.length
                      : PERMISSION_MODULES.filter((m) => getModulePermissionSummary(perms, m.id).isFull).length;
                    const readOnlyCount = isWildcard
                      ? 0
                      : PERMISSION_MODULES.filter((m) => getModulePermissionSummary(perms, m.id).isReadOnly).length;

                    return (
                      <tr key={role._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <span>{role.name}</span>
                              {role.name === 'admin' || role.name === 'super-admin' ? (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                  System
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                          <p className="truncate max-w-xs">{role.description || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          {isWildcard ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800">
                              <Sparkles className="w-3.5 h-3.5" /> Full Wildcard Access (*)
                            </span>
                          ) : (
                            <div className="space-y-1.5 max-w-sm">
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {activeModules.slice(0, 2).map((m) => {
                                  const s = getModulePermissionSummary(perms, m.id);
                                  return (
                                    <span
                                      key={m.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                        s.isFull
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                          : s.isReadOnly
                                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      }`}
                                    >
                                      {m.label}
                                      <span className="text-[10px] opacity-75 font-mono">
                                        {s.isFull ? '(Full)' : s.isReadOnly ? '(Read-Only)' : `(${s.actionCount}/4)`}
                                      </span>
                                    </span>
                                  );
                                })}

                                {activeModules.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setDetailRole(role)}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 transition-colors"
                                  >
                                    +{activeModules.length - 2} more...
                                  </button>
                                )}

                                {activeModules.length === 0 && (
                                  <span className="text-gray-400 dark:text-slate-500 text-xs italic">
                                    No permissions assigned
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400">
                                {fullCount > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {fullCount} Full
                                  </span>
                                )}
                                {readOnlyCount > 0 && (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {readOnlyCount} Read-Only
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDetailRole(role)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold ml-auto"
                                >
                                  <Eye className="w-3 h-3" /> View CRUD Grid
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-bold text-gray-700 dark:text-slate-300">
                            {role.usersCount || 0} Users
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                              role.status === 'inactive'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            }`}
                          >
                            {role.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {can('roles-permissions', 'update') && (
                            <button
                              onClick={() => handleEditRole(role)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded mr-1 transition-colors"
                              title="Edit Role & Permissions"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {can('roles-permissions', 'delete') && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              disabled={deletingRole === role._id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded disabled:opacity-50 transition-colors"
                              title="Delete Role"
                            >
                              {deletingRole === role._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-900 dark:text-white font-medium border-b border-gray-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Assigned Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                      <p className="text-gray-500 dark:text-slate-400 font-medium">No users found.</p>
                      <p className="text-xs mt-1 text-gray-400">Click &quot;Create User&quot; to add a staff or administrator.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0B1A45] text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                            {user.fullName?.slice(0, 2) || 'AD'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</div>
                            <div className="text-xs font-normal text-gray-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        <span>{user.phone || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                            user.isActive === false
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          {user.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {can('roles-permissions', 'update') && (
                          <button
                            onClick={() => {
                              setResetUserId(user._id);
                              setResetUserName(user.fullName);
                              setNewPassword('');
                              setResetModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded mr-1 transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        {can('roles-permissions', 'update') && (
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded mr-1 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('roles-permissions', 'delete') && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUser === user._id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded disabled:opacity-50 transition-colors"
                            title="Delete User"
                          >
                            {deletingUser === user._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Role Creation / Editing Modal with Granular CRUD Matrix ── */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-12 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl my-4 border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingRoleId ? 'Edit Role & CRUD Permissions' : 'Create Role with CRUD Permissions'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Define precise Read-Only, Create, Update, and Delete access per module
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roleError && (
              <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {roleError}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="flex-1 flex flex-col overflow-hidden">
              {/* Form Info Fields */}
              <div className="p-6 pb-4 space-y-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                      placeholder="e.g. Finance Officer, Support Executive"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                      placeholder="Brief role summary or purpose"
                    />
                  </div>
                </div>

                {/* Granular Permission Controls Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative w-full max-w-xs">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        placeholder="Search modules..."
                        className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 whitespace-nowrap">
                      {roleForm.permissions.length} actions selected
                    </span>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllReadOnly}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5"
                      title="Grants View/Read access across all modules, clearing edit/delete rights"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read-Only All
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFullAccess}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
                      title="Grants full Create, Read, Update, Delete access to all modules"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Full Access All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable CRUD Permission Matrix */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 divide-y divide-gray-100 dark:divide-slate-800">
                {Object.entries(filteredGroups).map(([group, modules]) => {
                  const open = expandedGroups.includes(group);
                  const totalInGroup = modules.length * 4;
                  let selectedInGroup = 0;
                  modules.forEach((m) => {
                    selectedInGroup += getModulePermissionSummary(roleForm.permissions, m.id).actionCount;
                  });

                  return (
                    <div key={group} className="pt-4 first:pt-0">
                      {/* Group Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className="flex items-center gap-2 text-left"
                        >
                          <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                            {group}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-gray-600 dark:text-slate-400">
                            {selectedInGroup}/{totalInGroup}
                          </span>
                          {open ? (
                            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => setGroupReadOnly(group, e)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800"
                          >
                            Read-Only Group
                          </button>
                          <button
                            type="button"
                            onClick={(e) => setGroupFull(group, e)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800"
                          >
                            Full Group
                          </button>
                          <button
                            type="button"
                            onClick={(e) => clearGroup(group, e)}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Group Modules Grid */}
                      {open && (
                        <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800">
                          {modules.map((m) => {
                            const summary = getModulePermissionSummary(roleForm.permissions, m.id);

                            return (
                              <div
                                key={m.id}
                                className="p-3.5 bg-white dark:bg-slate-900/60 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                              >
                                {/* Module Info */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                      {m.label}
                                    </span>
                                    {summary.isReadOnly && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                        Read-Only
                                      </span>
                                    )}
                                    {summary.isFull && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                        Full Access
                                      </span>
                                    )}
                                  </div>
                                  {m.description && (
                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                      {m.description}
                                    </p>
                                  )}
                                </div>

                                {/* Granular CRUD Actions */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {CRUD_ACTIONS.map((act) => {
                                    const checked = hasModuleAction(roleForm.permissions, m.id, act.id);

                                    return (
                                      <button
                                        key={act.id}
                                        type="button"
                                        onClick={() => toggleAction(m.id, act.id)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 select-none ${
                                          checked
                                            ? `${act.bg} ${act.color} shadow-sm ring-1 ring-inset ${
                                                act.id === 'read'
                                                  ? 'ring-blue-400/50'
                                                  : act.id === 'create'
                                                  ? 'ring-emerald-400/50'
                                                  : act.id === 'update'
                                                  ? 'ring-amber-400/50'
                                                  : 'ring-rose-400/50'
                                              }`
                                            : 'bg-gray-50 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            checked ? 'bg-current' : 'bg-gray-300 dark:bg-slate-600'
                                          }`}
                                        />
                                        {act.label}
                                      </button>
                                    );
                                  })}

                                  {/* Row-Level Quick Presets */}
                                  <div className="flex items-center gap-1 pl-1 border-l border-gray-200 dark:border-slate-800">
                                    <button
                                      type="button"
                                      onClick={() => toggleModuleReadOnly(m.id)}
                                      className="px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                      title="Grant Read-Only"
                                    >
                                      Read
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleModuleFull(m.id)}
                                      className="px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                                      title="Grant Full CRUD"
                                    >
                                      Full
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-4 flex-shrink-0">
                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Users assigned to this role receive these granular permissions immediately on their next request.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRoleModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRole}
                    className="px-5 py-2 bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-[#0B1A45]/20 transition-all"
                  >
                    {savingRole && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingRole ? 'Saving...' : editingRoleId ? 'Update Role & Permissions' : 'Create Role'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── User Modal ── */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-4 border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingUserId ? 'Edit User' : 'Create User'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Permissions are automatically inherited from the assigned role
                </p>
              </div>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {userError && (
              <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {userError}
              </div>
            )}
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                    placeholder="+880..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={userForm.role}
                    onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                  >
                    {roles.length === 0 && <option value="admin">Admin</option>}
                    {roles.map((r) => (
                      <option key={r._id} value={r.name}>
                        {r.name} ({r.permissions?.length || 0} perms)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={userForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setUserForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Password{' '}
                  {editingUserId ? (
                    <span className="text-gray-400 font-normal text-xs">(leave blank to keep current)</span>
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  minLength={6}
                  value={userForm.password}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex-1 px-4 py-2.5 bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-[#0B1A45]/20 transition-all"
                >
                  {savingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingUser ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Password Reset Modal ── */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Password</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  For: <span className="font-semibold text-gray-700 dark:text-slate-200">{resetUserName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0B1A45] outline-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 px-4 py-2.5 bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-[#0B1A45]/20 transition-all"
                >
                  {resettingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {resettingPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Granular CRUD Detail Inspection Modal ── */}
      {detailRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {detailRole.name} · CRUD Access Breakdown
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {detailRole.permissions?.includes('*')
                      ? 'Full Wildcard Administrator'
                      : `${detailRole.permissions?.length || 0} active actions assigned`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailRole(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {detailRole.permissions?.includes('*') ? (
                <div className="p-6 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto" />
                  <h4 className="text-base font-bold text-purple-900 dark:text-purple-200">
                    Super Administrator Role
                  </h4>
                  <p className="text-xs text-purple-700 dark:text-purple-300 max-w-md mx-auto">
                    This role contains the wildcard (<code className="font-bold font-mono">*</code>) permission. It has
                    unrestricted Create, Read, Update, and Delete access across all modules.
                  </p>
                </div>
              ) : (
                Object.entries(PERMISSION_MODULE_GROUPS).map(([group, modules]) => {
                  return (
                    <div key={group} className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200 border-b border-gray-100 dark:border-slate-800 pb-1.5">
                        {group}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {modules.map((m) => {
                          const s = getModulePermissionSummary(detailRole.permissions, m.id);

                          return (
                            <div
                              key={m.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                s.hasAny
                                  ? 'bg-gray-50/70 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700'
                                  : 'bg-transparent border-dashed border-gray-100 dark:border-slate-800/80 opacity-50'
                              }`}
                            >
                              <span className="font-semibold text-gray-900 dark:text-white truncate mr-2">
                                {m.label}
                              </span>

                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-bold">
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center ${
                                    s.hasRead
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                                  }`}
                                  title="Read / View"
                                >
                                  R
                                </span>
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center ${
                                    s.hasCreate
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                                  }`}
                                  title="Create"
                                >
                                  C
                                </span>
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center ${
                                    s.hasUpdate
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                                  }`}
                                  title="Update"
                                >
                                  U
                                </span>
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center ${
                                    s.hasDelete
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                                  }`}
                                  title="Delete"
                                >
                                  D
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 px-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailRole(null)}
                className="px-5 py-2 bg-[#0B1A45] hover:bg-[#132B66] text-white text-xs font-bold rounded-xl transition-all"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
