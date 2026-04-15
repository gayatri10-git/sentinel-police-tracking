import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeVoiceTranscript } from '../services/ai';
import { cn } from '../lib/utils';

interface VoiceReportButtonProps {
  onResult: (data: { incidentType: string; severity: string; description: string }) => void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error' | 'unsupported';

export default function VoiceReportButton({ onResult }: VoiceReportButtonProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) {
      setState('unsupported');
      return;
    }

    setState('listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(current);
    };

    recognition.onend = async () => {
      const finalTranscript = transcript || '';
      if (!finalTranscript.trim()) {
        setState('error');
        return;
      }
      setState('processing');
      try {
        const result = await analyzeVoiceTranscript(finalTranscript);
        setConfidence(result.confidence);
        onResult({
          incidentType: result.incidentType,
          severity: result.severity,
          description: result.description,
        });
        setState('done');
        setTimeout(() => setState('idle'), 3000);
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    };

    recognition.onerror = () => {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    };

    recognition.start();
  }, [transcript, SpeechRecognition, onResult]);

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const stateConfig = {
    idle: { icon: Mic, label: 'VOICE REPORT', color: 'text-brand-blue', bg: 'bg-brand-blue/10 border-brand-blue/30 hover:bg-brand-blue/20' },
    listening: { icon: MicOff, label: 'TAP TO STOP', color: 'text-brand-red', bg: 'bg-brand-red/10 border-brand-red/50' },
    processing: { icon: Loader2, label: 'AI PARSING...', color: 'text-brand-amber', bg: 'bg-brand-amber/10 border-brand-amber/30' },
    done: { icon: CheckCircle2, label: 'FORM FILLED', color: 'text-brand-emerald', bg: 'bg-brand-emerald/10 border-brand-emerald/30' },
    error: { icon: AlertCircle, label: 'TRY AGAIN', color: 'text-brand-red', bg: 'bg-brand-red/10 border-brand-red/30' },
    unsupported: { icon: MicOff, label: 'NOT SUPPORTED', color: 'text-gray-500', bg: 'bg-white/5 border-white/10' },
  };

  const cfg = stateConfig[state];
  const Icon = cfg.icon;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={state === 'listening' ? stopListening : startListening}
        disabled={state === 'processing' || state === 'unsupported'}
        className={cn(
          'w-full flex items-center justify-center gap-3 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all',
          cfg.bg, cfg.color
        )}
      >
        <Icon className={cn('w-5 h-5', state === 'listening' && 'animate-pulse', state === 'processing' && 'animate-spin')} />
        {cfg.label}
        {state === 'done' && confidence > 0 && (
          <span className="text-[9px] font-mono opacity-60">{Math.round(confidence * 100)}% CONF</span>
        )}
      </button>

      <AnimatePresence>
        {state === 'listening' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-brand-red rounded-full"
                    animate={{ height: [8, 20 + i * 4, 8] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-red animate-pulse">RECORDING</span>
            </div>
            {transcript && (
              <p className="text-xs text-gray-400 font-mono leading-relaxed italic">"{transcript}"</p>
            )}
            {!transcript && (
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Speak your emergency...</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
