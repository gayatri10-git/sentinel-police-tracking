import { AlertTriangle, X, Radio, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface EscalationAlertProps {
  incident: any;
  minutesElapsed: number;
  escalation: {
    shouldEscalate: boolean;
    reason: string;
    suggestedAction: string;
    urgency: 'low' | 'medium' | 'high';
  };
  onDismiss: () => void;
}

export default function EscalationAlert({ incident, minutesElapsed, escalation, onDismiss }: EscalationAlertProps) {
  if (!escalation.shouldEscalate) return null;

  const urgencyConfig = {
    low: { color: 'text-brand-amber', bg: 'bg-brand-amber/10', border: 'border-brand-amber/30', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' },
    medium: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' },
    high: { color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/40', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
  };

  const cfg = urgencyConfig[escalation.urgency];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('glass-card overflow-hidden border', cfg.border, cfg.glow)}
    >
      <div className={cn('px-5 py-3 flex items-center justify-between border-b border-white/10', cfg.bg)}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={cn('w-4 h-4 animate-pulse', cfg.color)} />
          <span className={cn('text-[10px] font-black uppercase tracking-widest', cfg.color)}>
            ESCALATION ALERT · {escalation.urgency.toUpperCase()}
          </span>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', cfg.bg)}>
            <Radio className={cn('w-4 h-4', cfg.color)} />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-tight">{incident.type} — {incident.id?.slice(-6)}</p>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{minutesElapsed} min on scene</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className={cn('text-xs font-bold leading-relaxed', cfg.color)}>"{escalation.reason}"</p>
          <div className="flex items-center gap-2 text-gray-400">
            <ChevronRight className="w-3 h-3" />
            <p className="text-[11px]">{escalation.suggestedAction}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
