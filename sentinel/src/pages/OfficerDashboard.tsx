import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Officer, Incident, IncidentStatus } from '../types';
import { 
  Radar, MapPin, Navigation, CheckCircle2, AlertCircle, Clock, 
  ShieldCheck, Zap, Loader2, Camera, Power, Activity, TrendingUp,
  ExternalLink, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getTacticalBriefing } from '../services/ai';
import ResolutionReportModal from '../components/ResolutionReportModal';

interface OfficerDashboardProps {
  user: UserProfile;
}

export default function OfficerDashboard({ user }: OfficerDashboardProps) {
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [dutyTime, setDutyTime] = useState(0);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);

  useEffect(() => {
    const unsubOfficer = onSnapshot(doc(db, 'officers', user.uid), (doc) => {
      if (doc.exists()) {
        setOfficer({ id: doc.id, ...doc.data() } as Officer);
      }
      setLoading(false);
    });

    const q = query(collection(db, 'incidents'), where('assigned_officer_id', '==', user.uid), where('status', 'in', ['Assigned', 'In Progress']));
    const unsubIncident = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveIncident({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Incident);
      } else {
        setActiveIncident(null);
        setBriefing(null);
      }
    });

    return () => {
      unsubOfficer();
      unsubIncident();
    };
  }, [user.uid]);

  useEffect(() => {
    let geoWatch: number;
    if (officer?.status !== 'off_duty') {
      geoWatch = navigator.geolocation.watchPosition(
        (position) => {
          updateDoc(doc(db, 'officers', user.uid), {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updated_at: serverTimestamp()
          });
        },
        (error) => console.error("Geo watch error:", error),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (geoWatch) navigator.geolocation.clearWatch(geoWatch);
    };
  }, [officer?.status, user.uid]);

  useEffect(() => {
    let interval: any;
    if (officer?.status !== 'off_duty') {
      interval = setInterval(() => {
        setDutyTime(prev => prev + 1);
      }, 1000);
    } else {
      setDutyTime(0);
    }
    return () => clearInterval(interval);
  }, [officer?.status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleDuty = async () => {
    if (!officer) return;
    const newStatus = officer.status === 'off_duty' ? 'on_duty' : 'off_duty';
    await updateDoc(doc(db, 'officers', user.uid), {
      status: newStatus,
      updated_at: serverTimestamp()
    });
  };

  const handleResolve = async (reportData: any) => {
    if (!activeIncident || !officer) return;
    
    const reportText = typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2);
    
    await updateDoc(doc(db, 'incidents', activeIncident.id), {
      status: 'Resolved',
      resolution_report: reportText,
      resolved_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    await updateDoc(doc(db, 'officers', user.uid), { 
      status: 'on_duty', 
      total_resolved: (officer.total_resolved || 0) + 1 
    });

    await addDoc(collection(db, 'incidents', activeIncident.id, 'timeline'), {
      incident_id: activeIncident.id,
      action: `Incident Resolved. Report: ${reportText.slice(0, 50)}...`,
      actor_name: user.name,
      timestamp: serverTimestamp()
    });

    setResolutionModalOpen(false);
  };

  const updateIncidentStatus = async (newStatus: IncidentStatus) => {
    if (!activeIncident || !officer) return;
    
    if (newStatus === 'Resolved') {
      setResolutionModalOpen(true);
      return;
    }

    await updateDoc(doc(db, 'incidents', activeIncident.id), {
      status: newStatus,
      updated_at: serverTimestamp()
    });

    if (newStatus === 'In Progress') {
      await updateDoc(doc(db, 'officers', user.uid), { status: 'on_scene' });
    }

    await addDoc(collection(db, 'incidents', activeIncident.id, 'timeline'), {
      incident_id: activeIncident.id,
      action: `Status changed to ${newStatus}`,
      actor_name: user.name,
      timestamp: serverTimestamp()
    });
  };

  const fetchBriefing = async () => {
    if (!activeIncident) return;
    setBriefingLoading(true);
    try {
      const text = await getTacticalBriefing(activeIncident);
      setBriefing(text || 'No briefing available.');
    } catch (err) {
      console.error(err);
    } finally {
      setBriefingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative overflow-hidden">
      <div className="scanline" />
      {/* Left Panel: Officer Status */}
      <div className="lg:col-span-4 space-y-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8 flex flex-col items-center text-center relative overflow-hidden glow-blue border-white/5"
        >
          <div className={cn(
            "absolute top-0 left-0 w-full h-1",
            officer?.status === 'on_duty' ? "bg-brand-emerald shadow-[0_0_10px_#00ffa3]" : officer?.status === 'on_scene' ? "bg-brand-amber shadow-[0_0_10px_#ffb800]" : "bg-brand-red shadow-[0_0_10px_#ff2d55]"
          )} />
          
          <div className="relative mb-8">
            <div className={cn(
              "w-32 h-32 rounded-full border-2 flex items-center justify-center p-2 transition-all duration-500",
              officer?.status === 'on_duty' ? "border-brand-emerald/30 shadow-[0_0_40px_rgba(0,255,163,0.15)]" : officer?.status === 'on_scene' ? "border-brand-amber/30 shadow-[0_0_40px_rgba(255,184,0,0.15)]" : "border-brand-red/30 shadow-[0_0_40px_rgba(255,45,85,0.15)]"
            )}>
              <div className="w-full h-full rounded-full bg-white/[0.02] flex items-center justify-center overflow-hidden">
                <ShieldCheck className={cn(
                  "w-16 h-16 transition-colors duration-500",
                  officer?.status === 'on_duty' ? "text-brand-emerald" : officer?.status === 'on_scene' ? "text-brand-amber" : "text-brand-red"
                )} />
              </div>
            </div>
            {officer?.status !== 'off_duty' && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-emerald rounded-full border-4 border-brand-dark flex items-center justify-center shadow-[0_0_15px_#00ffa3]"
              >
                <Radar className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          <h2 className="text-4xl font-display font-black tracking-tighter uppercase leading-none">{user.name}</h2>
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">BADGE_ID // {officer?.badge_number}</p>

          <div className="grid grid-cols-2 gap-4 w-full mt-10">
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Resolved</p>
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <p className="text-2xl font-display font-black">{officer?.total_resolved || 0}</p>
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Duty Timer</p>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-brand-blue" />
                <p className="text-lg font-mono font-bold tracking-widest">{formatTime(dutyTime)}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={toggleDuty}
            className={cn(
              "w-full mt-8 py-5 rounded-2xl font-black tracking-[0.3em] uppercase text-xs transition-all flex items-center justify-center gap-3 border",
              officer?.status === 'off_duty' 
                ? "bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald hover:text-brand-dark shadow-[0_0_30px_rgba(0,255,163,0.1)]" 
                : "bg-brand-red/10 border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white shadow-[0_0_30px_rgba(255,45,85,0.1)]"
            )}
          >
            <Power className="w-4 h-4" />
            {officer?.status === 'off_duty' ? 'Initialize Duty' : 'Terminate Duty'}
          </button>
        </motion.div>

        <div className="glass-card p-6 space-y-6 border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Telemetry Feed</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-pulse shadow-[0_0_8px_#00ffa3]" />
              <span className="text-[8px] font-black uppercase tracking-widest text-brand-emerald">Live Broadcast</span>
            </div>
          </div>
          <div className="bg-white/[0.01] rounded-2xl p-5 border border-white/5 font-mono text-[10px] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-2 uppercase tracking-widest">Lat_Coord</span>
              <span className="text-brand-blue font-bold">{officer?.latitude?.toFixed(6) || '0.000000'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-2 uppercase tracking-widest">Lng_Coord</span>
              <span className="text-brand-blue font-bold">{officer?.longitude?.toFixed(6) || '0.000000'}</span>
            </div>
            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-gray-600 flex items-center gap-2 uppercase tracking-widest">Sig_Status</span>
              <span className="text-brand-emerald font-bold">STABLE_LINK</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Active Incident */}
      <div className="lg:col-span-8 space-y-6 relative z-10">
        <AnimatePresence mode="wait">
          {!activeIncident ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-12 flex flex-col items-center justify-center text-center h-full min-h-[500px] border-dashed border-2 border-white/5"
            >
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 relative">
                <Radar className="w-12 h-12 text-gray-700 animate-pulse" />
                <motion.div 
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 border border-brand-blue/30 rounded-full"
                />
              </div>
              <h3 className="text-3xl font-display font-black mb-4 tracking-tight">STANDBY MODE</h3>
              <p className="text-gray-500 max-w-sm leading-relaxed uppercase text-xs font-bold tracking-widest">
                No active assignments. Monitoring emergency frequencies for high-priority incidents.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass-card overflow-hidden glow-red border-brand-red/20">
                <div className={cn(
                  "px-8 py-6 flex items-center justify-between border-b border-white/10",
                  activeIncident.severity === 'critical' ? "bg-brand-red/10" : "bg-white/5"
                )}>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "p-4 rounded-2xl",
                      activeIncident.severity === 'critical' ? "bg-brand-red/20 text-brand-red" : "bg-brand-blue/20 text-brand-blue"
                    )}>
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-2xl tracking-tight uppercase">{activeIncident.type}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">INCIDENT_REF: {activeIncident.id.slice(-8)}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg",
                    activeIncident.severity === 'critical' ? "bg-brand-red/20 border-brand-red text-brand-red animate-pulse-red" : "bg-white/10 border-white/20 text-gray-400"
                  )}>
                    {activeIncident.severity} PRIORITY
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Reported Situation</label>
                      <p className="text-sm leading-relaxed text-gray-300 font-medium">{activeIncident.description}</p>
                    </div>

                    {/* AI Briefing Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                          <Brain className="w-3 h-3 text-brand-blue" />
                          Tactical Intelligence
                        </label>
                        {!briefing && (
                          <button 
                            onClick={fetchBriefing}
                            disabled={briefingLoading}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:text-white transition-colors disabled:opacity-50"
                          >
                            {briefingLoading ? 'ANALYZING FEED...' : 'GENERATE BRIEFING'}
                          </button>
                        )}
                      </div>
                      <AnimatePresence>
                        {briefing && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-brand-blue/10 border border-brand-blue/20 rounded-2xl p-5 flex gap-4"
                          >
                            <Zap className="w-6 h-6 text-brand-blue shrink-0" />
                            <p className="text-xs text-brand-blue leading-relaxed italic font-medium">"{briefing}"</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeIncident.status === 'Assigned' && (
                        <button 
                          onClick={() => updateIncidentStatus('In Progress')}
                          className="w-full py-5 bg-brand-amber hover:bg-amber-600 text-white font-black tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        >
                          <MapPin className="w-5 h-5" />
                          ON SCENE
                        </button>
                      )}
                      {activeIncident.status === 'In Progress' && (
                        <button 
                          onClick={() => updateIncidentStatus('Resolved')}
                          className="w-full py-5 bg-brand-emerald hover:bg-emerald-600 text-white font-black tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          RESOLVE
                        </button>
                      )}
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeIncident.latitude},${activeIncident.longitude}`, '_blank')}
                        className="w-full py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3"
                      >
                        <Navigation className="w-5 h-5 text-brand-blue" />
                        NAVIGATE
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="aspect-video rounded-3xl overflow-hidden bg-brand-dark border border-white/10 relative group">
                      {activeIncident.photo_url ? (
                        <>
                          <img src={activeIncident.photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                            <button className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" /> Enlarge Evidence
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-800 gap-4">
                          <Camera className="w-16 h-16" />
                          <span className="text-[10px] font-black uppercase tracking-widest">No Visual Data</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Deployment Target</label>
                      <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                        <div className="p-3 bg-brand-red/20 rounded-xl">
                          <MapPin className="w-6 h-6 text-brand-red" />
                        </div>
                        <div>
                          <p className="text-xs font-mono text-white">{activeIncident.latitude.toFixed(6)}, {activeIncident.longitude.toFixed(6)}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">Target Coordinates</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="glass-card p-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  Mission Timeline
                </h4>
                <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-8 h-8 bg-brand-blue/20 rounded-full border-4 border-brand-dark flex items-center justify-center">
                      <div className="w-2 h-2 bg-brand-blue rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-tight">Incident Logged</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">
                      {new Date(activeIncident.created_at?.toDate()).toLocaleString()}
                    </p>
                  </div>
                  {activeIncident.assigned_at && (
                    <div className="relative pl-10">
                      <div className="absolute left-0 top-1 w-8 h-8 bg-brand-amber/20 rounded-full border-4 border-brand-dark flex items-center justify-center">
                        <div className="w-2 h-2 bg-brand-amber rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-tight">Unit Dispatched</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">
                        {new Date(activeIncident.assigned_at?.toDate()).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeIncident && resolutionModalOpen && (
          <ResolutionReportModal 
            incident={activeIncident}
            officerId={user.uid}
            onClose={() => setResolutionModalOpen(false)}
            onConfirmResolve={handleResolve}
          />
        )}
      </div>
    </div>
  );
}
