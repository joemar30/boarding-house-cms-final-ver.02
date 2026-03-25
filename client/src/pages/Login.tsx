import { useState } from 'react';
import { useLocation } from 'wouter';
import { usePhpAuth } from '@/contexts/PhpAuthContext';
import { phpAuth } from '@/lib/phpApi';
import { Eye, EyeOff, UserPlus, LogIn, AlertCircle, CheckCircle2, Building2, Server, Home, Wrench, Shield } from 'lucide-react';

type AuthMode = 'login' | 'register';

const ROLES = [
  { value: 'tenant', label: 'Tenant', icon: Home, desc: 'I am a resident/boarder' },
  { value: 'staff',  label: 'Staff',  icon: Wrench, desc: 'I am a maintenance/support staff' },
];

export default function Login() {
  const { login, backendAvailable } = usePhpAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPw, setRegConfirmPw] = useState('');
  const [regRole, setRegRole] = useState('tenant');
  const [regPhone, setRegPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (regPassword !== regConfirmPw) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await phpAuth.register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
        phone: regPhone,
      });
      setSuccess('Account created! You can now log in.');
      setMode('login');
      setIdentifier(regEmail);
    } catch (err: any) {
      setError(err.message ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Subtle Background Elements */}
      <div style={{
        position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, oklch(0.55 0.18 255 / 0.05) 0%, transparent 70%)',
        top: '-100px', left: '-100px', animation: 'float 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, oklch(0.55 0.18 255 / 0.03) 0%, transparent 70%)',
        bottom: '-100px', right: '-100px', animation: 'float 15s ease-in-out infinite reverse',
      }} />

      <div className="w-full max-w-md px-4 relative z-10 animate-in fade-in zoom-in duration-500">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-2xl mx-auto mb-4 flex items-center justify-center overflow-hidden shadow-xl shadow-primary/20 rotate-[-4deg] transition-transform hover:rotate-0 duration-500 bg-white p-2">
            <img src="/logo.png" className="h-full w-full object-contain" alt="CMS Logo" />
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Boarding House
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Complaint Management System</p>
        </div>

        {/* glassmorphism Card */}
        <div className="bg-card border border-border rounded-[32px] p-8 md:p-10 shadow-2xl shadow-primary/5 transition-all hover:shadow-primary/10">
          {/* Tabs */}
          <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-8 border border-border/50">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  mode === m 
                    ? 'bg-white text-primary shadow-lg shadow-primary/5 border border-primary/10' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Register</>}
              </button>
            ))}
          </div>

          {/* Local Alerts */}
          {!backendAvailable && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs mb-2 uppercase tracking-wider">
                <Server size={14} /> System Offline
              </div>
              <p className="text-xs text-amber-600/80 leading-relaxed font-medium">Please start Apache &amp; MySQL in your XAMPP Control Panel to access the database.</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-6 animate-in shake-in">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-[13px] font-semibold">{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 size={18} className="shrink-0" />
                <span className="text-[13px] font-semibold">{success}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-muted-foreground/80 px-1 uppercase tracking-wider">
                  Identifier
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Username or Email"
                  required
                  className="w-full h-13 px-5 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none font-medium placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-muted-foreground/80 px-1 uppercase tracking-wider">
                  Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-13 px-5 pr-12 rounded-2xl bg-muted/30 border border-border focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none font-medium placeholder:text-muted-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl font-bold text-[16px] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:grayscale disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.55 0.18 255), oklch(0.65 0.15 280))',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                    <span>Access CMS Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground/80 block mb-3 px-1 uppercase tracking-wider">
                  Profile Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRegRole(r.value)}
                      className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
                        regRole === r.value 
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-sm' 
                          : 'border-border bg-muted/20 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${regRole === r.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          <r.icon size={14} />
                        </div>
                        <span className={`text-[13px] font-bold ${regRole === r.value ? 'text-primary' : 'text-foreground'}`}>{r.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Name', value: regName, setter: setRegName, placeholder: 'Joemar', type: 'text', required: true },
                  { label: 'User', value: regUsername, setter: setRegUsername, placeholder: 'joemar123', type: 'text', required: true },
                  { label: 'Email', value: regEmail, setter: setRegEmail, placeholder: 'j@cms.id', type: 'email', required: true },
                  { label: 'Phone', value: regPhone, setter: setRegPhone, placeholder: '09XXXX', type: 'tel', required: false },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground/70 px-1 uppercase tracking-tighter">
                      {f.label}{f.required && '*'}
                    </label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      required={f.required}
                      className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border focus:border-primary transition-all outline-none text-sm font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Key', value: regPassword, setter: setRegPassword },
                  { label: 'Confirm', value: regConfirmPw, setter: setRegConfirmPw },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground/70 px-1 uppercase tracking-tighter">
                      {f.label}*
                    </label>
                    <input
                      type="password"
                      value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      required
                      className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border focus:border-primary transition-all outline-none text-sm font-medium"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 mt-2 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.55 0.18 255), oklch(0.65 0.15 280))',
                  color: 'white',
                }}
              >
                {loading ? 'Creating Profile...' : <><UserPlus size={18} /> Join Now</>}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-8 space-y-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            © 2026 Boarding House CMS
          </p>
          <p className="text-[12px] font-black lowercase tracking-[0.2em] text-primary">
            Built by <span className="underline decoration-2 underline-offset-4">Joemar Developer</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(25px, -35px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }
        @keyframes shake-in {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(4px); }
          50% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        input::placeholder { color: oklch(var(--muted-foreground) / 0.3) !important; font-size: 13px; }
        
        /* Font Synchronization with Admin */
        .w-full { font-family: 'Inter', sans-serif; }
        h1, h2, h3, h4, label, button, .tracking-widest { font-family: 'Outfit', sans-serif !important; }
        input, select, textarea { font-family: 'Inter', sans-serif !important; }
      `}</style>
    </div>
  );
}
