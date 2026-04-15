import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Incident, Officer } from '../types';
import { 
  LayoutDashboard, Users, AlertCircle, BarChart3, Shield, 
  Clock, Map as MapIcon, TrendingUp, CheckCircle2, AlertTriangle, 
  Search, Filter, MoreVertical, UserPlus, MessageSquare, Send, 
  Loader2, Zap, Brain, Activity, Globe, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCommandIntelligence, getDispatchRecommendation } from '../services/ai';
import ThreatHeatmap from '../components/ThreatHeatmap';
import DispatchRecommendation from '../components/DispatchRecommendation';
import OfficerMetrics from '../components/OfficerMetrics';

interface AdminDashboardProps {
  user: UserProfile;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'officers' | 'incidents' | 'analytics'>('overview');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    onDuty: 0,
    resolved: 0,
    avgResponse: 12
  });
  
  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [enlistModalOpen, setEnlistModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState<{open: boolean, incident: Incident | null}>({ open: false, incident: null });
  const [currentRecommendation, setCurrentRecommendation] = useState<any>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [metricsOfficer, setMetricsOfficer] = useState<Officer | null>(null);
  const [newOfficer, setNewOfficer] = useState({ name: '', badge: '' });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dispatchModalOpen.open && dispatchModalOpen.incident) {
      const fetchRecommendation = async () => {
        setLoadingRecommendation(true);
        try {
          const rec = await getDispatchRecommendation(dispatchModalOpen.incident, officers);
          setCurrentRecommendation(rec);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingRecommendation(false);
        }
      };
      fetchRecommendation();
    } else {
      setCurrentRecommendation(null);
    }
  }, [dispatchModalOpen.open, dispatchModalOpen.incident, officers]);

  useEffect(() => {
    const unsubIncidents = onSnapshot(query(collection(db, 'incidents'), orderBy('created_at', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(docs);
      setStats(prev => ({
        ...prev,
        active: docs.filter(i => i.status !== 'Resolved' && i.status !== 'False Alarm').length,
        resolved: docs.filter(i => i.status === 'Resolved').length
      }));
    });

    const unsubOfficers = onSnapshot(collection(db, 'officers'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Officer));
      setOfficers(docs);
      setStats(prev => ({
        ...prev,
        onDuty: docs.filter(o => o.status !== 'off_duty').length
      }));
    });

    return () => {
      unsubIncidents();
      unsubOfficers();
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleRedeploy = async (officer: Officer) => {
    try {
      await updateDoc(doc(db, 'officers', officer.id), {
        status: 'off_duty',
        current_incident_id: null,
        updated_at: serverTimestamp()
      });
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-8 right-8 bg-brand-emerald text-brand-dark px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest z-[200] animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.4)]';
      toast.innerText = `UNIT ${officer.badge_number} REDEPLOYED TO STANDBY`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      console.error("Redeploy failed:", err);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const response = await getCommandIntelligence(userMsg, { incidents, officers });
      setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "Error accessing command intelligence. Please retry." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleEnlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficer.name || !newOfficer.badge) return;

    try {
      // In a real app, we'd create a user first. 
      // For this demo, we'll just add to the officers collection with a random ID if no user exists,
      // but ideally we should link it to a user.
      // Let's just mock it by adding a doc to 'officers'
      await addDoc(collection(db, 'officers'), {
        name: newOfficer.name,
        badge_number: newOfficer.badge,
        status: 'off_duty',
        latitude: 40.7128,
        longitude: -74.0060,
        total_resolved: 0,
        updated_at: serverTimestamp(),
        user_id: `mock_${Math.random().toString(36).substr(2, 9)}`
      });
      setEnlistModalOpen(false);
      setNewOfficer({ name: '', badge: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = [
    { name: 'Accident', count: incidents.filter(i => i.type === 'Accident').length },
    { name: 'Fire', count: incidents.filter(i => i.type === 'Fire').length },
    { name: 'Crime', count: incidents.filter(i => i.type === 'Crime').length },
    { name: 'Medical', count: incidents.filter(i => i.type === 'Medical').length },
    { name: 'Property', count: incidents.filter(i => i.type === 'Property').length },
    { name: 'Other', count: incidents.filter(i => i.type === 'Other').length },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-dark relative tactical-grid">
      <div className="scanline" />
      {/* Sidebar */}
      <aside className="w-72 bg-brand-dark border-r border-white/5 flex flex-col relative z-20">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-brand-blue/10 rounded-xl border border-brand-blue/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]">
              <ShieldAlert className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black tracking-tighter text-white leading-none">SENTINEL</h2>
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-blue/60 mt-1">v4.2.0_STABLE</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Ops Overview' },
            { id: 'officers', icon: Users, label: 'Unit Management' },
            { id: 'incidents', icon: AlertCircle, label: 'Incident Logs' },
            { id: 'analytics', icon: BarChart3, label: 'Intelligence' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group border",
                activeTab === item.id 
                  ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20 shadow-[0_0_20px_rgba(0,242,255,0.05)]" 
                  : "text-gray-500 border-transparent hover:bg-white/[0.02] hover:text-gray-300"
              )}
            >
              <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeTab === item.id ? "text-brand-blue" : "text-gray-500")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center border border-brand-red/20 shadow-[0_0_15px_rgba(255,45,85,0.1)]">
              <Shield className="w-5 h-5 text-brand-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black truncate text-white uppercase tracking-widest">{user.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1 h-1 bg-brand-emerald rounded-full animate-pulse shadow-[0_0_5px_#00ffa3]" />
                <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h1 className="text-6xl font-display font-black tracking-tighter text-white uppercase leading-none">Command Center</h1>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-brand-blue font-black tracking-[0.3em] uppercase text-[10px]">Operational Status: Optimal</p>
                    <div className="w-px h-3 bg-white/10" />
                    <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[10px]">Real-time Command Feed</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">System Time</span>
                    <div className="flex items-center gap-3 px-6 py-3 bg-white/[0.02] rounded-2xl border border-white/5">
                      <Clock className="w-4 h-4 text-brand-blue" />
                      <span className="text-sm font-mono font-bold text-white tracking-widest">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </header>

              {/* Bento Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Active Alerts', value: stats.active, icon: AlertTriangle, color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/20', desc: 'High priority incidents' },
                  { label: 'Units Deployed', value: stats.onDuty, icon: Shield, color: 'text-brand-emerald', bg: 'bg-brand-emerald/10', border: 'border-brand-emerald/20', desc: 'Officers on active duty' },
                  { label: 'Resolved Today', value: stats.resolved, icon: CheckCircle2, color: 'text-brand-blue', bg: 'bg-brand-blue/10', border: 'border-brand-blue/20', desc: 'Closed cases (24h)' },
                  { label: 'Avg Response', value: `${stats.avgResponse}m`, icon: TrendingUp, color: 'text-brand-amber', bg: 'bg-brand-amber/10', border: 'border-brand-amber/20', desc: 'Global response velocity' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("glass-card p-8 group relative overflow-hidden", stat.border)}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <stat.icon className={cn("w-16 h-16", stat.color)} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className={cn("p-3 rounded-xl", stat.bg)}>
                          <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{stat.label}</p>
                      </div>
                      <p className="text-5xl font-display font-black text-white mb-2">{stat.value}</p>
                      <p className="text-[9px] font-medium text-gray-600 uppercase tracking-widest">{stat.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {[
                  { label: 'Sector Alpha', status: 'Stable', load: '12%', color: 'text-brand-emerald' },
                  { label: 'Sector Bravo', status: 'Active', load: '45%', color: 'text-brand-blue' },
                  { label: 'Sector Charlie', status: 'High Load', load: '82%', color: 'text-brand-amber' },
                ].map((sector, i) => (
                  <div key={i} className="glass-card p-6 border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{sector.label}</p>
                      <p className="text-sm font-black text-white uppercase">{sector.status}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-mono font-bold", sector.color)}>{sector.load}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Resource Load</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Recent Incidents Feed */}
                <div className="lg:col-span-8 glass-card p-8 space-y-8 relative overflow-hidden">
                  <div className="scanline" />
                  <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-3">
                      <Activity className="w-4 h-4 text-brand-red" />
                      Tactical Incident Feed
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-[8px] font-mono text-gray-600">ENCRYPTION: AES-256</span>
                      <button className="text-[10px] font-black text-brand-blue hover:text-white transition-colors tracking-widest">EXPORT_LOGS</button>
                    </div>
                  </div>
                  <div className="space-y-3 relative z-10">
                    {incidents.slice(0, 6).map((incident) => (
                      <motion.div 
                        key={incident.id}
                        layout
                        className="flex items-center gap-6 p-4 bg-white/[0.01] hover:bg-white/[0.04] rounded-2xl border border-white/[0.03] transition-all group cursor-pointer"
                      >
                        <div className={cn(
                          "w-1 h-10 rounded-full",
                          incident.severity === 'critical' ? "bg-brand-red shadow-[0_0_10px_#ff2d55]" : incident.severity === 'high' ? "bg-brand-amber" : "bg-brand-blue"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-0.5">
                            <p className="text-sm font-black uppercase tracking-tight text-white">{incident.type}</p>
                            <span className="text-[9px] font-mono text-gray-600">ID://{incident.id.slice(-6).toUpperCase()}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wide">{incident.description}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className={cn(
                            "px-3 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                            incident.status === 'Pending' ? "text-gray-500 border-white/10" : "text-brand-blue border-brand-blue/30 bg-brand-blue/10"
                          )}>{incident.status}</div>
                          <p className="text-[9px] text-gray-600 font-mono">{new Date(incident.created_at?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* System Pulse / Intelligence */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="glass-card p-8 border-brand-blue/20 relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Brain className="w-32 h-32 text-brand-blue" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-8">
                        <Brain className="w-5 h-5 text-brand-blue" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Neural Intelligence</h3>
                      </div>
                      
                      <div className="flex-1 space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">System Load</span>
                            <span className="text-[9px] font-mono text-brand-emerald">NORMAL</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '42%' }}
                              className="h-full bg-brand-blue shadow-[0_0_10px_#00f2ff]"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Predictive Accuracy</span>
                            <span className="text-[9px] font-mono text-brand-blue">94.2%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '94%' }}
                              className="h-full bg-brand-emerald shadow-[0_0_10px_#00ffa3]"
                            />
                          </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-white/5">
                          <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-medium">
                            AI engine is currently processing <span className="text-white">1,240 telemetry points</span> per second. No anomalies detected in the current sector.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'officers' && (
            <motion.div 
              key="officers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase">Personnel Roster</h1>
                  <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[10px] mt-1">Unit Deployment & Status</p>
                </div>
                <button 
                  onClick={() => setEnlistModalOpen(true)}
                  className="btn-primary flex items-center gap-3"
                >
                  <UserPlus className="w-5 h-5" />
                  ENLIST OFFICER
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {officers.map((officer) => (
                  <motion.div 
                    key={officer.id} 
                    layout
                    className="glass-card p-8 relative overflow-hidden group hover:border-brand-blue/30 transition-all"
                  >
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1.5 transition-colors",
                      officer.status === 'on_duty' ? "bg-brand-emerald" : officer.status === 'on_scene' ? "bg-brand-amber" : "bg-brand-red"
                    )} />
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand-blue/5 transition-colors">
                          <Shield className={cn(
                            "w-8 h-8 transition-colors",
                            officer.status === 'on_duty' ? "text-brand-emerald" : officer.status === 'on_scene' ? "text-brand-amber" : "text-brand-red"
                          )} />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white uppercase tracking-tight">{officer.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-1">{officer.badge_number}</p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Deployment Status</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full font-black uppercase tracking-widest text-[9px] border",
                          officer.status === 'on_duty' ? "bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald" : 
                          officer.status === 'on_scene' ? "bg-brand-amber/10 border-brand-amber/30 text-brand-amber" : 
                          "bg-brand-red/10 border-brand-red/30 text-brand-red"
                        )}>{officer.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Mission Success</span>
                        <span className="font-mono text-white text-sm font-bold">{officer.total_resolved || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">GPS Lock</span>
                        <span className="font-mono text-[10px] text-brand-blue">{officer.latitude.toFixed(4)}, {officer.longitude.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex gap-3">
                      <button 
                        onClick={() => setMetricsOfficer(officer)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                      >
                        VIEW METRICS
                      </button>
                      <button 
                        onClick={() => handleRedeploy(officer)}
                        className="flex-1 py-3 bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-brand-dark rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-brand-blue/20"
                      >
                        REDEPLOY
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'incidents' && (
            <motion.div 
              key="incidents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase">Incident Archives</h1>
                  <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[10px] mt-1">Historical Operational Data</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="SEARCH LOGS..."
                      className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-mono focus:outline-none focus:border-brand-blue transition-all w-72"
                    />
                  </div>
                  <button className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                    <Filter className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </header>

              <div className="glass-card rounded-3xl border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Classification</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Priority</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Situational Data</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Timestamp</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-brand-blue/30 transition-colors">
                              <ShieldAlert className="w-5 h-5 text-brand-blue" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-tight text-white">{incident.type}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            incident.severity === 'critical' ? "bg-brand-red/10 border-brand-red/30 text-brand-red" :
                            incident.severity === 'high' ? "bg-orange-500/10 border-orange-500/30 text-orange-500" :
                            "bg-brand-amber/10 border-brand-amber/30 text-brand-amber"
                          )}>{incident.severity}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs text-gray-500 truncate max-w-xs font-medium">{incident.description}</p>
                        </td>
                        <td className="px-8 py-6">
                          {incident.status === 'Pending' ? (
                            <button 
                              onClick={() => setDispatchModalOpen({ open: true, incident })}
                              className="px-4 py-2 bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl border border-brand-blue/20 transition-all flex items-center gap-2"
                            >
                              <Zap className="w-3 h-3" />
                              AI DISPATCH
                            </button>
                          ) : (
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                              incident.status === 'Resolved' ? "bg-brand-emerald/10 text-brand-emerald" :
                              incident.status === 'Pending' ? "bg-gray-500/10 text-gray-500" :
                              "bg-brand-blue/10 text-brand-blue"
                            )}>{incident.status}</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-[10px] text-gray-500 font-mono font-bold">
                          {new Date(incident.created_at?.toDate()).toLocaleString()}
                        </td>
                        <td className="px-8 py-6">
                          <button className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10 h-full flex flex-col"
            >
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase">Intelligence Hub</h1>
                  <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[10px] mt-1">Predictive Hotspot Analysis</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-6 py-3 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl flex items-center gap-3">
                    <Brain className="w-4 h-4 text-brand-blue" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue">AI_PREDICTION: ENABLED</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 min-h-[600px] grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 glass-card rounded-3xl overflow-hidden relative border-white/5 p-6">
                  <ThreatHeatmap 
                    incidents={incidents} 
                    officers={officers} 
                  />
                </div>

                {/* Map Overlay UI */}
                <div className="space-y-6">
                  <div className="glass-card p-6 space-y-6 border-white/5 bg-brand-dark/40 backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tactical Legend</h4>
                      <div className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-red shadow-[0_0_10px_#ff2d55]" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">Critical Threat</span>
                        </div>
                        <span className="text-[10px] font-mono text-brand-red font-bold">{incidents.filter(i => i.severity === 'critical').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-amber shadow-[0_0_10px_#ffb800]" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">High Activity</span>
                        </div>
                        <span className="text-[10px] font-mono text-brand-amber font-bold">{incidents.filter(i => i.severity === 'high').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_10px_#00f2ff]" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">Standard Ops</span>
                        </div>
                        <span className="text-[10px] font-mono text-brand-blue font-bold">{incidents.filter(i => i.severity === 'low' || i.severity === 'medium').length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 border-brand-emerald/20 bg-brand-dark/40 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                      <TrendingUp className="w-4 h-4 text-brand-emerald" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Predictive Insight</h4>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed uppercase font-medium">
                      Neural analysis predicts a <span className="text-brand-emerald">15% increase</span> in medical emergencies in the downtown sector within the next <span className="text-white">04:00:00</span>.
                    </p>
                  </div>

                  <div className="glass-card p-6 border-brand-blue/20 bg-brand-dark/40 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-4">
                      <Globe className="w-4 h-4 text-brand-blue" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Resource Optimizer</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
                        <span>Sector Efficiency</span>
                        <span className="text-brand-emerald font-mono">OPTIMAL_0.98</span>
                      </div>
                      <button 
                        onClick={() => {
                          const toast = document.createElement('div');
                          toast.className = 'fixed bottom-8 right-8 bg-brand-emerald text-brand-dark px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest z-[200] animate-bounce shadow-[0_0_30px_rgba(0,255,163,0.4)]';
                          toast.innerText = 'OPTIMIZING RESOURCE ALLOCATION...';
                          document.body.appendChild(toast);
                          setTimeout(() => toast.remove(), 3000);
                        }}
                        className="w-full py-3 bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-brand-dark text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all border border-brand-blue/20"
                      >
                        RUN_REDEPLOYMENT_SIM
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enlist Modal */}
        <AnimatePresence>
          {enlistModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card p-8 w-full max-w-md space-y-8 border-brand-blue/30"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-blue/20 rounded-xl">
                    <UserPlus className="w-6 h-6 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-display font-black uppercase tracking-tight">Enlist Unit</h3>
                </div>

                <form onSubmit={handleEnlist} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Officer Name</label>
                    <input 
                      type="text" 
                      required
                      value={newOfficer.name}
                      onChange={(e) => setNewOfficer(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-brand-blue"
                      placeholder="ENTER FULL NAME..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Badge Number</label>
                    <input 
                      type="text" 
                      required
                      value={newOfficer.badge}
                      onChange={(e) => setNewOfficer(prev => ({ ...prev, badge: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-brand-blue"
                      placeholder="UNIT-XXXX"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEnlistModalOpen(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      CANCEL
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 btn-primary"
                    >
                      CONFIRM
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dispatch Modal */}
        <AnimatePresence>
          {dispatchModalOpen.open && dispatchModalOpen.incident && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-dark/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card p-8 w-full max-w-lg space-y-8 border-brand-blue/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-blue/20 rounded-xl">
                      <Zap className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-black uppercase tracking-tight">AI Smart Dispatch</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Incident: {dispatchModalOpen.incident.type}</p>
                    </div>
                  </div>
                  <button onClick={() => setDispatchModalOpen({ open: false, incident: null })} className="text-gray-500 hover:text-white transition-colors">
                    <MoreVertical className="w-6 h-6 rotate-90" />
                  </button>
                </div>

                {loadingRecommendation ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">AI Calculating Optimal Response...</p>
                  </div>
                ) : currentRecommendation ? (
                  <DispatchRecommendation 
                    incident={dispatchModalOpen.incident} 
                    recommendation={currentRecommendation}
                    officers={officers}
                    onDispatched={() => setDispatchModalOpen({ open: false, incident: null })}
                    onDismiss={() => setDispatchModalOpen({ open: false, incident: null })}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">Failed to generate recommendation.</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Officer Metrics Modal */}
        <AnimatePresence>
          {metricsOfficer && (
            <OfficerMetrics 
              officer={metricsOfficer}
              incidents={incidents}
              onClose={() => setMetricsOfficer(null)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* AI Command Intelligence Chat Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-96 h-[500px] glass-card flex flex-col overflow-hidden glow-blue border-brand-blue/30"
            >
              <div className="p-6 bg-brand-blue/10 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/20 rounded-lg">
                    <Brain className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white">Command Intelligence</h4>
                    <p className="text-[9px] text-brand-blue font-bold uppercase tracking-widest animate-pulse">Neural Link Active</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5 rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <Zap className="w-10 h-10 text-brand-blue" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 max-w-[200px]">
                      Awaiting query. Ask about incident trends, unit status, or tactical recommendations.
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-xs leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-brand-blue text-white rounded-tr-none" 
                        : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-600 mt-2">
                      {msg.role === 'user' ? 'ADMIN' : 'SENTINEL_AI'}
                    </span>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-3 text-brand-blue">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Processing Neural Data...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="p-6 border-t border-white/10 bg-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="ENTER COMMAND..."
                    className="w-full bg-brand-dark border border-white/10 rounded-xl py-4 pl-5 pr-12 text-xs font-mono focus:outline-none focus:border-brand-blue transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-blue hover:text-white transition-colors disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl relative group",
            chatOpen ? "bg-brand-red rotate-90" : "bg-brand-blue hover:scale-110"
          )}
        >
          {chatOpen ? <AlertTriangle className="w-8 h-8 text-white" /> : <MessageSquare className="w-8 h-8 text-white" />}
          {!chatOpen && (
            <motion.div 
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-brand-blue rounded-full"
            />
          )}
        </button>
      </div>
    </div>
  );
}
