import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { Incident, Officer } from '../types';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, TrendingUp, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface OfficerMetricsProps {
  officer: Officer;
  incidents: Incident[];
  onClose: () => void;
}

export default function OfficerMetrics({ officer, incidents, onClose }: OfficerMetricsProps) {
  const officerIncidents = incidents.filter(i => i.assigned_officer_id === officer.id && i.status === 'Resolved');

  // 1. Incident Types Handled
  const typeData = officerIncidents.reduce((acc: any[], curr) => {
    const existing = acc.find(a => a.name === curr.type);
    if (existing) existing.value++;
    else acc.push({ name: curr.type, value: 1 });
    return acc;
  }, []);

  // 2. Resolution Rate Over Time (Last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = officerIncidents.filter(inc => {
      const resDate = inc.resolved_at?.toDate();
      return resDate && resDate.toDateString() === d.toDateString();
    }).length;
    return { name: dateStr, count };
  }).reverse();

  // 3. Avg Response Time
  const avgTime = officerIncidents.length > 0 
    ? officerIncidents.reduce((acc, curr) => {
        const start = curr.assigned_at?.toDate()?.getTime();
        const end = curr.resolved_at?.toDate()?.getTime();
        return start && end ? acc + (end - start) / 60000 : acc;
      }, 0) / officerIncidents.length
    : 0;

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#6b7280'];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-brand-dark/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card w-full max-w-5xl max-h-[90vh] overflow-y-auto p-10 space-y-10 border-brand-blue/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
              <Shield className="w-10 h-10 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white">{officer.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">UNIT_{officer.badge_number}</p>
                <div className="w-1 h-1 bg-gray-700 rounded-full" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Performance Analytics</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-gray-400 hover:text-white"
          >
            CLOSE_SESSION
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Avg Resolution
            </p>
            <p className="text-3xl font-display font-black text-white">{avgTime.toFixed(1)}<span className="text-xs text-gray-500 ml-1">MIN</span></p>
          </div>
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Mission Success
            </p>
            <p className="text-3xl font-display font-black text-brand-emerald">{officerIncidents.length}</p>
          </div>
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Efficiency
            </p>
            <p className="text-3xl font-display font-black text-brand-blue">98.4<span className="text-xs text-gray-500 ml-1">%</span></p>
          </div>
          <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> Risk Factor
            </p>
            <p className="text-3xl font-display font-black text-brand-red">0.02<span className="text-xs text-gray-500 ml-1">σ</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Resolution Rate Chart */}
          <div className="glass-card p-8 space-y-6 border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Resolution Velocity (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 800 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 800 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incident Types Chart */}
          <div className="glass-card p-8 space-y-6 border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Expertise Distribution</h3>
              <div className="px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full text-[8px] font-black text-brand-blue uppercase tracking-widest">
                Top Skill: {typeData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 800 }} width={100} />
                  <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0a0e1a', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 p-8 bg-brand-blue/5 border border-brand-blue/10 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-32 h-32 text-brand-blue" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-2 bg-brand-blue/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-brand-blue" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">AI Performance Insight</h4>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed uppercase font-medium">
                Officer {officer.name} shows exceptional efficiency in <span className="text-brand-blue">Medical</span> and <span className="text-brand-red">Fire</span> response. 
                Current trajectory suggests a 12% improvement in resolution time over the next quarter. 
                Recommendation: Assign as Lead Responder for high-severity medical incidents in Sector Bravo.
              </p>
            </div>
          </div>

          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col justify-center">
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Tactical Rating</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < 4 ? "bg-brand-blue shadow-[0_0_10px_rgba(0,242,255,0.3)]" : "bg-white/10")} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Field Reliability</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < 5 ? "bg-brand-emerald shadow-[0_0_10px_rgba(0,255,163,0.3)]" : "bg-white/10")} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
