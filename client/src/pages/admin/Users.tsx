import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpUsers, type PhpUser } from "@/lib/phpApi";
import { Search, Edit2, Trash2, UserPlus, X, Check, AlertCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

const roleColors: Record<string, string> = {
  admin:  "bg-purple-100 text-purple-700",
  staff:  "bg-blue-100 text-blue-700",
  tenant: "bg-green-100 text-green-700",
};

type CreateUserForm = {
  name: string; username: string; email: string; password: string;
  role: string; phone: string; apartment_number: string;
};

const emptyForm: CreateUserForm = {
  name: '', username: '', email: '', password: '', role: 'tenant', phone: '', apartment_number: '',
};

export default function AdminUsers() {
  const [users, setUsers]         = useState<PhpUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState<PhpUser | null>(null);
  const [form, setForm]           = useState<CreateUserForm>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role   = roleFilter;
      const data = await phpUsers.list(params);
      setUsers(data);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [searchTerm, roleFilter]);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        if (rows.length < 1) throw new Error('Empty CSV file');
        
        const header = rows[0].toLowerCase();
        const startIdx = header.includes('name') || header.includes('email') ? 1 : 0;
        const data = rows.slice(startIdx).map(row => {
          const cells = row.split(',').map(c => c.trim());
          return {
            name: cells[0] || '',
            username: cells[1] || '',
            email: cells[2] || '',
            role: (cells[3] || 'tenant').toLowerCase(),
            phone: cells[4] || '',
            apartment_number: cells[5] || '',
            password: 'User123!' // Default password for imported users
          };
        }).filter(u => u.name && u.email);

        if (data.length === 0) throw new Error('No valid user data found. Format: name,username,email,role,phone,apartment');

        const res = await phpUsers.bulkCreate(data);
        toast.success(`Imported ${res.count} users successfully!`);
        if (res.errors?.length > 0) toast.warning(`${res.errors.length} errors occurred. Check console.`);
        fetchUsers();
      } catch (err: any) {
        toast.error(err.message ?? 'Import failed');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (u: PhpUser) => {
    setEditUser(u);
    setForm({ name: u.name, username: u.username, email: u.email, password: '', role: u.role, phone: u.phone ?? '', apartment_number: u.apartment_number ?? '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editUser) {
        const payload: any = { name: form.name, email: form.email, role: form.role, phone: form.phone, apartment_number: form.apartment_number };
        if (form.password) payload.password = form.password;
        await phpUsers.update(editUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await phpUsers.create(form);
        toast.success('User created successfully');
      }
      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: PhpUser) => {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    try {
      await phpUsers.delete(u.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed');
    }
  };

  const handleToggleActive = async (u: PhpUser) => {
    try {
      await phpUsers.update(u.id, { is_active: u.is_active ? 0 : 1 });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <MotionPage className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">View, create and manage all users</p>
        </div>
        <div className="flex gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="h-4 w-4" /> {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email or username..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>

      {/* Main Content (Responsive Table/Cards) */}
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="text-center py-20 bg-card/50 backdrop-blur-sm border-dashed">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">Retrieving user database...</p>
              </Card>
            </motion.div>
          ) : users.length > 0 ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Desktop Table View */}
              <Card className="hidden md:block overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        {['Name', 'Email / Username', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {users.map((u, i) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-accent/30 transition-colors group"
                        >
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary group-hover:scale-110 transition-transform">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[150px]">{u.name || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-col">
                              <span className="text-foreground/90 font-medium">{u.email}</span>
                              <span className="text-xs text-muted-foreground">@{u.username}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role] ?? ''}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                               <div className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                               <span className={`text-xs font-semibold ${u.is_active ? 'text-emerald-700' : 'text-red-700'}`}>
                                 {u.is_active ? 'Active' : 'Inactive'}
                               </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                            {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleToggleActive(u)} title={u.is_active ? 'Deactivate' : 'Activate'}>
                                {u.is_active ? <X className="h-3.5 w-3.5 text-orange-500" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(u)} className="text-destructive hover:text-destructive" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {users.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-4 space-y-4 hover:border-primary/20 transition-all active:scale-[0.98]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-tight">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role] ?? ''}`}>
                          {u.role}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-muted-foreground uppercase tracking-widest font-black text-[9px] mb-1">Status</p>
                          <div className="flex items-center gap-1.5 font-bold">
                            <div className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className={u.is_active ? 'text-emerald-700' : 'text-red-700'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/30">
                          <p className="text-muted-foreground uppercase tracking-widest font-black text-[9px] mb-1">Joined</p>
                          <p className="font-bold">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] font-bold" onClick={() => openEdit(u)}>
                          <Edit2 className="h-3 w-3 mr-1.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] font-bold" onClick={() => handleToggleActive(u)}>
                          {u.is_active ? <X className="h-3 w-3 mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                          {u.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(u)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="text-center py-20 border-border/50 bg-card/50">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">No users found</p>
                <p className="text-muted-foreground">Try adjusting your filters or search term</p>
                <Button variant="outline" className="mt-6 font-bold" onClick={() => { setSearchTerm(""); setRoleFilter(""); }}>Clear all filters</Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg"
            >
              <Card className="p-6 shadow-2xl border-primary/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">{editUser ? 'Edit User' : 'Create New User'}</h2>
                  <button onClick={() => setShowModal(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Juan dela Cruz' },
                      { label: 'Username *', key: 'username', type: 'text', placeholder: 'jdelacruz', disabled: !!editUser },
                      { label: 'Email *', key: 'email', type: 'email', placeholder: 'juan@email.com' },
                      { label: 'Phone', key: 'phone', type: 'tel', placeholder: '09XX-XXX-XXXX' },
                      { label: editUser ? 'New Password' : 'Password *', key: 'password', type: 'password', placeholder: editUser ? 'Leave blank to keep' : 'Min 6 chars' },
                      { label: 'Apartment #', key: 'apartment_number', type: 'text', placeholder: 'Room 101' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={(form as any)[f.key]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          disabled={f.disabled}
                          required={!editUser && ['name','username','email','password'].includes(f.key)}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm disabled:opacity-60 transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">Role *</label>
                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="tenant">Tenant</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1 font-bold" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 font-bold" disabled={saving}>
                      {saving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
