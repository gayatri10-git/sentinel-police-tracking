import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Loader2, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateResolutionReport } from '../services/ai';
import { cn } from '../lib/utils';

interface ResolutionReportModalProps {
  incident: any;
  officerId: string;
  onClose: () => void;
  onConfirmResolve: (report: any) => void;
}

export default function ResolutionReportModal({ incident, officerId, onClose, onConfirmResolve }: ResolutionReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch timeline
      const timelineSnap = await getDocs(collection(db, 'incidents', incident.id, 'timeline'));
      const timeline = timelineSnap.docs.map(d => d.data());

      // Fetch officer
      const officerSnap = await getDoc(doc(db, 'officers', officerId));
      const officer = officerSnap.exists() ? officerSnap.data() : null;

      // Calculate duration
      const assignedAt = incident.assigned_at?.toDate?.() || new Date();
      const durationMinutes = Math.round((Date.now() - assignedAt.getTime()) / 60000);

      const result = await generateResolutionReport(incident, officer, timeline, durationMinutes);
      setReport(result);
    } catch (err) {
      setError('Failed to generate report. You can still resolve the incident.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const content = `SENTINEL INCIDENT REPORT
${report.reportNumber}
${'='.repeat(50)}

EXECUTIVE SUMMARY
${report.summary}

OUTCOME: ${report.outcomeClassification}

CHRONOLOGY
${report.chronology}

OFFICER NARRATIVE
${report.officerNarrative}

FOLLOW-UP REQUIRED
${report.recommendedFollowUp}

Generated: ${new Date().toLocaleString()}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reportNumber || 'SENTINEL-REPORT'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col glass-card border-brand-emerald/20 glow-blue overflow-hidden"
      >
        {/* Header */}
        <div className="bg-brand-emerald/10 border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-emerald/20 rounded-lg">
              <FileText className="w-4 h-4 text-brand-emerald" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white">AI Resolution Report</p>
              <p className="text-[9px] text-brand-emerald font-bold uppercase tracking-widest">
                {loading ? 'Generating...' : report?.reportNumber || 'SENTINEL REPORT'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="w-10 h-10 text-brand-emerald animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 animate-pulse">
                AI Compiling Incident Record...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-brand-amber text-sm">{error}</p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Outcome Badge */}
              <div className="flex items-center gap-3 p-4 bg-brand-emerald/10 border border-brand-emerald/20 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-brand-emerald" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Outcome Classification</p>
                  <p className="text-sm font-black text-brand-emerald">{report.outcomeClassification}</p>
                </div>
              </div>

              {/* Summary */}
              <Section title="Executive Summary">
                <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
              </Section>

              {/* Chronology */}
              <Section title="Incident Chronology">
                <div className="space-y-2">
                  {report.chronology.split('\n').filter(Boolean).map((line: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <div className="w-1.5 h-1.5 bg-brand-blue rounded-full mt-1.5 shrink-0" />
                      <span>{line.replace(/^[•\-*]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Officer Narrative */}
              <Section title="Officer Narrative">
                <p className="text-sm text-gray-300 leading-relaxed italic">"{report.officerNarrative}"</p>
              </Section>

              {/* Follow Up */}
              <Section title="Recommended Follow-Up">
                <p className="text-sm text-gray-400">{report.recommendedFollowUp}</p>
              </Section>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Shield className="w-3 h-3 text-brand-blue" />
                <p className="text-[9px] text-gray-600 font-mono">Generated by SENTINEL AI · {new Date().toLocaleString()}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3 shrink-0">
          {report && (
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          <button
            onClick={() => onConfirmResolve(report)}
            className="flex-1 py-3 bg-brand-emerald hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Resolution
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h4>
      {children}
    </div>
  );
}
