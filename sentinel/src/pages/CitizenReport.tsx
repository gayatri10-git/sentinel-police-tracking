import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, IncidentSeverity } from '../types';
import { 
  AlertTriangle, Camera, MapPin, Send, Loader2, CheckCircle2, 
  Car, Flame, ShieldAlert, Activity, Home, HelpCircle, Brain, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeIncident } from '../services/ai';
import { cn } from '../lib/utils';
import VoiceReportButton from '../components/VoiceReportButton';

interface CitizenReportProps {
  user: UserProfile;
}

const INCIDENT_TYPES = [
  { id: 'Accident', icon: Car, label: 'Accident' },
  { id: 'Fire', icon: Flame, label: 'Fire' },
  { id: 'Crime', icon: ShieldAlert, label: 'Crime' },
  { id: 'Medical', icon: Activity, label: 'Medical' },
  { id: 'Property', icon: Home, label: 'Property' },
  { id: 'Other', icon: HelpCircle, label: 'Other' }
];

export default function CitizenReport({ user }: CitizenReportProps) {
  const [type, setType] = useState('Accident');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        
        // Auto-start AI analysis
        setAnalyzing(true);
        try {
          const analysis = await analyzeIncident(base64.split(',')[1], description);
          setAiAnalysis(analysis);
          if (analysis.severity) setSeverity(analysis.severity.toLowerCase() as any);
          if (analysis.incidentType) {
            const matchedType = INCIDENT_TYPES.find(t => t.id.toLowerCase() === analysis.incidentType.toLowerCase());
            if (matchedType) setType(matchedType.id);
          }
          if (analysis.summary && !description) setDescription(analysis.summary);
        } catch (err: any) {
          console.error("AI Analysis failed:", err);
          // If it's a missing API key error, we can show a more specific message if we want, 
          // but for now just logging is fine as per instructions not to ask user for keys.
        } finally {
          setAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setDetectingLocation(false);
      },
      (error) => {
        console.error("Error detecting location:", error);
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, 'incidents'), {
        type,
        severity,
        description,
        photo_url: image || null,
        status: 'Pending',
        reporter_id: user.uid,
        created_at: serverTimestamp(),
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        ai_summary: aiAnalysis?.summary || null,
        ai_tags: aiAnalysis?.tags || [],
      });

      setLastIncidentId(docRef.id);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass-card rounded-3xl p-12 text-center glow-emerald border-brand-emerald/30"
        >
          <div className="w-24 h-24 bg-brand-emerald/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-brand-emerald" />
          </div>
          <h2 className="text-4xl font-display font-bold mb-4">DISPATCHED</h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            Incident <span className="text-white font-mono">#SENT-{lastIncidentId?.slice(-6).toUpperCase() || 'UNKNOWN'}</span> has been logged. 
            The nearest unit is being rerouted to your coordinates.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="w-full btn-primary"
          >
            RETURN TO COMMAND
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-6 lg:p-12 space-y-12">
      <header className="flex flex-col gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 bg-brand-red/20 rounded-2xl border border-brand-red/30">
            <ShieldAlert className="w-8 h-8 text-brand-red" />
          </div>
          <div>
            <h1 className="text-5xl font-display font-black tracking-tighter uppercase">Emergency Report</h1>
            <p className="text-gray-500 font-medium tracking-widest uppercase text-sm">Citizen Response Interface</p>
          </div>
        </motion.div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 space-y-10"
          >
            {/* Incident Type Grid */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">1. Select Incident Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {INCIDENT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all group",
                      type === t.id 
                        ? "bg-brand-blue/20 border-brand-blue text-brand-blue shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                        : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                    )}
                  >
                    <t.icon className={cn("w-8 h-8 transition-transform group-hover:scale-110", type === t.id ? "text-brand-blue" : "text-gray-500")} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Selector */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">2. Assess Severity</label>
              <div className="flex flex-wrap gap-4">
                {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "flex-1 min-w-[120px] py-4 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      severity === s ? {
                        'low': 'bg-brand-emerald/20 border-brand-emerald text-brand-emerald shadow-[0_0_15px_rgba(16,185,129,0.2)]',
                        'medium': 'bg-brand-amber/20 border-brand-amber text-brand-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]',
                        'high': 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
                        'critical': 'bg-brand-red/20 border-brand-red text-brand-red glow-red animate-pulse-red'
                      }[s] : "bg-white/5 border-white/10 text-gray-500"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">3. Situation Description</label>
                <VoiceReportButton onResult={(data) => {
                  if (data.incidentType) setType(data.incidentType);
                  if (data.severity) setSeverity(data.severity as any);
                  setDescription(prev => prev ? `${prev}\n${data.description}` : data.description);
                }} />
              </div>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[200px] focus:outline-none focus:border-brand-blue transition-colors font-mono text-sm leading-relaxed"
                placeholder="PROVIDE DETAILED SITUATIONAL DATA..."
              />
            </div>
          </motion.div>
        </div>

        {/* Right Column - Evidence & Location */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 space-y-8"
          >
            {/* Photo Upload */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Visual Evidence</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={cn(
                  "aspect-square rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 transition-all group-hover:border-brand-blue/50 overflow-hidden relative",
                  image ? "border-none" : ""
                )}>
                  {image ? (
                    <>
                      <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {analyzing && (
                        <div className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <Brain className="w-10 h-10 text-brand-blue animate-pulse" />
                          <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">AI ANALYZING...</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-6 bg-white/5 rounded-full group-hover:bg-brand-blue/10 transition-colors">
                        <Camera className="w-10 h-10 text-gray-500 group-hover:text-brand-blue transition-colors" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Upload Evidence</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* AI Results */}
            <AnimatePresence>
              {aiAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl space-y-3"
                >
                  <div className="flex items-center gap-2 text-brand-blue">
                    <Brain className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Assessment</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed italic">"{aiAnalysis.summary}"</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-brand-blue/20 text-brand-blue text-[9px] font-bold uppercase rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Deployment Coordinates</label>
              <button 
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className={cn(
                  "w-full py-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all",
                  location ? "border-brand-emerald/50 text-brand-emerald" : "hover:bg-white/10"
                )}
              >
                {detectingLocation ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MapPin className={cn("w-5 h-5", location ? "text-brand-emerald" : "text-brand-blue")} />
                    {location ? "COORDINATES LOCKED" : "DETECT LOCATION"}
                  </>
                )}
              </button>
              {location && (
                <div className="text-center">
                  <span className="text-[10px] font-mono text-gray-500">LAT: {location.lat} | LNG: {location.lng}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || analyzing}
              className="w-full btn-emergency py-6 flex items-center justify-center gap-3 text-lg"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <Send className="w-6 h-6" />
                  REPORT NOW
                </>
              )}
            </button>
          </motion.div>

          <div className="p-6 bg-brand-amber/10 border border-brand-amber/20 rounded-2xl flex gap-4">
            <AlertTriangle className="w-6 h-6 text-brand-amber shrink-0" />
            <p className="text-[10px] text-brand-amber font-bold leading-relaxed uppercase tracking-wider">
              False reports are subject to criminal prosecution. All data is logged for forensic analysis.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
