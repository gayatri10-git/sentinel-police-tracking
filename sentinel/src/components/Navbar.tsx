import { auth } from '../firebase';
import { UserProfile } from '../types';
import { Shield, LogOut, Bell, User, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface NavbarProps {
  user: UserProfile;
}

export default function Navbar({ user }: NavbarProps) {
  const handleLogout = () => auth.signOut();

  return (
    <nav className="sticky top-0 z-50 bg-brand-dark/60 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="p-2.5 bg-brand-blue/20 rounded-xl border border-brand-blue/30 glow-blue"
        >
          <ShieldAlert className="w-6 h-6 text-brand-blue" />
        </motion.div>
        <div className="flex flex-col">
          <span className="font-display font-black text-2xl tracking-tighter text-white leading-none">SENTINEL</span>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-blue opacity-70">Smart Response</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            user.role === 'admin' ? "bg-brand-red shadow-[0_0_8px_rgba(239,68,68,0.8)]" : 
            user.role === 'officer' ? "bg-brand-amber shadow-[0_0_8px_rgba(245,158,11,0.8)]" : 
            "bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{user.role} ACCESS</span>
        </div>

        <div className="flex items-center gap-5">
          <button className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all relative group">
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-red rounded-full border-2 border-brand-dark" />
          </button>
          
          <div className="flex items-center gap-4 pl-6 border-l border-white/10">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-black uppercase tracking-tight text-white">{user.name}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white border border-brand-red/20 rounded-xl transition-all group"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
