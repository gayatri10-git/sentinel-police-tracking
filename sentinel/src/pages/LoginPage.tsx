import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Loader2, AlertCircle, User, Briefcase, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'New User',
          email: user.email,
          role: selectedRole,
          created_at: serverTimestamp(),
        });
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-brand-dark relative overflow-hidden grid-background">
      {/* Left Side - Brand & Tagline */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/5 blur-[120px] rounded-full animate-pulse" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <div className="p-8 bg-brand-blue/10 rounded-[40px] border border-brand-blue/20 inline-block mb-8 glow-blue">
            <Shield className="w-32 h-32 text-brand-blue" />
          </div>
          <h1 className="text-7xl font-display font-black tracking-tighter text-white mb-4">
            SENTINEL
          </h1>
          <p className="text-2xl text-brand-blue font-medium tracking-widest uppercase opacity-80">
            Protect. Respond. Resolve.
          </p>
        </motion.div>

        {/* Siren SVG Animation in corner */}
        <div className="absolute bottom-12 left-12 flex gap-2">
          <div className="w-3 h-3 bg-brand-red rounded-full animate-ping" />
          <div className="w-3 h-3 bg-brand-blue rounded-full animate-ping [animation-delay:0.5s]" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md glass-card p-8 lg:p-10 glow-blue"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold mb-2">Command Access</h2>
            <p className="text-gray-400">Identify yourself to proceed</p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex p-1 bg-white/5 rounded-xl mb-8 border border-white/10">
            {[
              { id: 'citizen', icon: User, label: 'Citizen' },
              { id: 'officer', icon: Briefcase, label: 'Officer' },
              { id: 'admin', icon: ShieldCheck, label: 'Admin' }
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id as any)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                  selectedRole === role.id 
                    ? "bg-brand-blue text-white shadow-lg" 
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <role.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{role.label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-start gap-3 text-brand-red text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Credentials</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-blue transition-colors font-mono text-sm"
                  placeholder="USER_ID@SENTINEL.GOV"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-blue transition-colors font-mono text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-4 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'INITIALIZE AUTHENTICATION'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#121624] px-4 text-gray-500 font-bold tracking-[0.2em]">Secure Gateway</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            GOOGLE BIOMETRIC LOGIN
          </button>

          <div className="mt-8 text-center text-xs text-gray-500">
            No active profile? <Link to="/signup" className="text-brand-blue font-bold hover:underline">Request Access</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
