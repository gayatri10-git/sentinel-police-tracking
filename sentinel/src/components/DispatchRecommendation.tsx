import { useState } from 'react';
import { Zap, User, MapPin, CheckCircle2, X, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface RankedOfficer {
  id: string;
  name: string;
  badge_number: string;
  distKm: string;
  score: number;
}

interface DispatchRecommendationProps {
  incident: any;
  recommendation: {
    recommendedOfficerId: string;
    reason: string;
    confidence: number;
    alternativeIds: string[];
    rankedOfficers: RankedOfficer[];
  };
  officers: any[];
  onDispatched: () => void;
  onDismiss: () => void;
}

export default function DispatchRecommendation({
  incident,
  recommendation,
  officers,
  onDispatched,
  onDismiss,
}: DispatchRecommendationProps) {
  const [selectedId, setSelectedId] = useState(recommendation.recommendedOfficerId);
  const [dispatching, setDispatching] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const getOfficer = (id: string) => officers.find(o => o.id === id);
  const recommended = getOfficer(recommendation.recommendedOfficerId);
  const selected = getOfficer(selectedId);
  const selectedRanked = recommendation.rankedOfficers.find(o => o.id === selectedId);

  const handleDispatch = async () => {
    if (!selectedId || !incident?.id) return;
    setDispatching(true);
    try {
      await updateDoc(doc(db, 'incidents', incident.id), {
        status: 'Assigned',
        assigned_officer_id: selectedId,
        assigned_at: serverTimestamp(),
      });
      await updateDoc(doc(db, 'officers', selectedId), {
        status: 'on_duty',
        current_incident_id: incident.id,
        updated_at: serverTimestamp(),
      });
      await addDoc(collection(db, 'incidents', incident.id, 'timeline'), {
        incident_id: incident.id,
        action: `Dispatched to ${selected?.name || 'officer'} via AI recommendation`,
        actor_name: 'SENTINEL AI',
        timestamp: serverTimestamp(),
      });
      onDispatched();
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(false);
    }
  };

  const confidencePct = Math.round((recommendation.confidence || 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      className="glass-card border-brand-blue/30 glow-blue overflow-hidden"
    >
      {/* Header */}
      <div className="bg-brand-blue/10 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-blue/20 rounded-lg">
            <Zap className="w-4 h-4 text-brand-blue" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white">AI Dispatch Recommendation</p>
            <p className="text-[9px] text-brand-blue font-bold uppercase tracking-widest">
              {incident.type} · {incident.severity.toUpperCase()} PRIORITY
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Recommended Officer Card */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Recommended Unit</p>
          <div
            onClick={() => setSelectedId(recommendation.recommendedOfficerId)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
              selectedId === recommendation.recommendedOfficerId
                ? 'bg-brand-blue/15 border-brand-blue/50'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-brand-blue/20 flex items-center justify-center border border-brand-blue/30">
              <User className="w-6 h-6 text-brand-blue" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white uppercase tracking-tight">{recommended?.name || 'Unknown'}</p>
              <p className="text-[10px] text-gray-500 font-mono">{recommended?.badge_number}</p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 text-brand-emerald justify-end">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-black font-mono">
                  {recommendation.rankedOfficers[0]?.distKm || '?'}km
                </span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-brand-blue">
                {confidencePct}% MATCH
              </div>
            </div>
          </div>

          {/* AI Reason */}
          <div className="px-4 py-3 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
            <p className="text-[11px] text-gray-400 leading-relaxed italic">
              "{recommendation.reason}"
            </p>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">AI Confidence</span>
            <span className="text-[10px] font-mono text-brand-blue font-bold">{confidencePct}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-brand-blue to-brand-emerald rounded-full"
            />
          </div>
        </div>

        {/* Alternative Officers */}
        {recommendation.rankedOfficers.length > 1 && (
          <div>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronDown className={cn('w-3 h-3 transition-transform', showAlternatives && 'rotate-180')} />
              {showAlternatives ? 'Hide' : 'Show'} alternatives ({recommendation.rankedOfficers.length - 1})
            </button>
            <AnimatePresence>
              {showAlternatives && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  {recommendation.rankedOfficers.slice(1).map((ro) => {
                    const off = getOfficer(ro.id);
                    return (
                      <div
                        key={ro.id}
                        onClick={() => setSelectedId(ro.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                          selectedId === ro.id
                            ? 'bg-brand-blue/15 border-brand-blue/50'
                            : 'bg-white/5 border-white/5 hover:border-white/15'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-white">{off?.name}</p>
                          <p className="text-[9px] text-gray-600 font-mono">{ro.distKm}km away</p>
                        </div>
                        {selectedId === ro.id && (
                          <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDispatch}
            disabled={dispatching || !selectedId}
            className="flex-1 py-4 bg-brand-blue hover:bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50"
          >
            {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {dispatching ? 'Dispatching...' : `Dispatch ${selected?.name?.split(' ')[0] || 'Officer'}`}
          </button>
          <button
            onClick={onDismiss}
            className="px-5 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest rounded-xl transition-all text-xs"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.div>
  );
}
