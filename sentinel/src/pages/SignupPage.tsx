import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, Loader2, AlertCircle, BadgeCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { cn } from '../lib/utils';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length > 6) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        created_at: serverTimestamp(),
      });

      if (role === 'officer') {
        await setDoc(doc(db, 'officers', user.uid), {
          user_id: user.uid,
          name,
          badge_number: `OFF-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'off_duty',
          latitude: 0,
          longitude: 0,
          total_resolved: 0,
          updated_at: serverTimestamp(),
        });
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
          role,
          created_at: serverTimestamp(),
        });

        if (role === 'officer') {
          await setDoc(doc(db, 'officers', user.uid), {
            user_id: user.uid,
            name: user.displayName || 'New Officer',
            badge_number: `OFF-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'off_duty',
            latitude: 0,
            longitude: 0,
            total_resolved: 0,
            updated_at: serverTimestamp(),
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden grid-background">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl glass-card p-8 lg:p-10 relative z-10 glow-blue"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-brand-blue/10 rounded-2xl mb-4 border border-brand-blue/20">
            <Shield className="w-10 h-10 text-brand-blue" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">System Enrollment</h1>
          <p className="text-gray-400 mt-2">Establish your digital identity</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-start gap-3 text-brand-red text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'citizen', icon: User, label: 'Citizen', color: 'text-brand-blue', bg: 'bg-brand-blue/10', border: 'border-brand-blue/30' },
              { id: 'officer', icon: BadgeCheck, label: 'Officer', color: 'text-brand-amber', bg: 'bg-brand-amber/10', border: 'border-brand-amber/30' },
              { id: 'admin', icon: ShieldCheck, label: 'Admin', color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/30' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id as any)}
                className={cn(
                  "p-4 rounded-xl border transition-all flex flex-col items-center gap-2 group",
                  role === r.id 
                    ? `${r.bg} ${r.border} ${r.color} scale-[1.05] shadow-lg` 
                    : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                )}
              >
                <r.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", role === r.id ? r.color : "text-gray-500")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{r.label}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            ENROLL WITH GOOGLE
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#121624] px-4 text-gray-500 font-bold tracking-[0.2em]">Manual Entry</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-blue transition-colors text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-blue transition-colors text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-blue transition-colors text-sm"
                  placeholder="••••••••"
                />
              </div>
              {/* Password Strength Indicator */}
              <div className="flex gap-1 mt-2 px-1">
                {[25, 50, 75, 100].map((step) => (
                  <div 
                    key={step}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-500",
                      getPasswordStrength() >= step 
                        ? (getPasswordStrength() <= 50 ? "bg-brand-red" : getPasswordStrength() <= 75 ? "bg-brand-amber" : "bg-brand-emerald")
                        : "bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-4 mt-6 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRM ENROLLMENT'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          Already registered? <Link to="/login" className="text-brand-blue font-bold hover:underline">Access Gateway</Link>
        </div>
      </motion.div>
    </div>
  );
}
