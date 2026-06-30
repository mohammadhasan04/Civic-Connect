'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Loader2, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    resolved: number;
    resolutionRate: number;
    trendData: { name: string; total: number }[];
    categoryData: { name: string; value: number }[];
    statusData: { name: string; value: number; color: string }[];
  } | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createBrowserSupabaseClient();
        
        // Fetch complaints
        const { data: complaints } = await supabase.from('complaints').select('status, created_at, category_id, categories(name_en)');
        
        if (!complaints) return;
        
        // Process Status Breakdown
        const statusCounts = {
          NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0
        };
        
        // Process Trends
        const trendMap: Record<string, number> = {};
        
        // Process Categories
        const catMap: Record<string, number> = {};
        
        complaints.forEach(c => {
          // Status
          if (statusCounts[c.status as keyof typeof statusCounts] !== undefined) {
            statusCounts[c.status as keyof typeof statusCounts]++;
          }
          
          // Trends by month
          const date = new Date(c.created_at);
          const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
          trendMap[monthYear] = (trendMap[monthYear] || 0) + 1;
          
          // Categories
          let catName = 'Other';
          if (c.categories) {
            catName = Array.isArray(c.categories) ? c.categories[0]?.name_en : (c.categories as { name_en: string }).name_en;
          }
          catName = catName || 'Other';
          catMap[catName] = (catMap[catName] || 0) + 1;
        });

        const trendData = Object.keys(trendMap).map(k => ({ name: k, total: trendMap[k] }));
        const categoryData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
        
        const statusData = [
          { name: 'Pending (New/Assigned)', value: statusCounts.NEW + statusCounts.ASSIGNED, color: '#f5a623' },
          { name: 'In Progress', value: statusCounts.IN_PROGRESS, color: '#3b82f6' },
          { name: 'Resolved', value: statusCounts.RESOLVED, color: '#22c55e' },
          { name: 'Closed', value: statusCounts.CLOSED, color: '#ef4444' }
        ];

        setStats({
          total: complaints.length,
          resolved: statusCounts.RESOLVED,
          resolutionRate: complaints.length > 0 ? Math.round((statusCounts.RESOLVED / complaints.length) * 100) : 0,
          trendData,
          categoryData,
          statusData
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Aggregating Municipal Metrics...</p>
        </div>
      </DashboardShell>
    );
  }

  const COLORS = ['#004f35', '#22c55e', '#3b82f6', '#f5a623', '#ef4444', '#a855f7'];

  return (
    <DashboardShell>
      <div className="animate-fade-in-up pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
               <BarChart3 className="w-8 h-8 text-[var(--primary)]" />
               Executive Analytics
            </h1>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Real-time macro overview of municipal operations and infrastructure.</p>
          </div>
          
          <button className="btn-secondary whitespace-nowrap"><Calendar className="w-4 h-4 mr-2" /> This Year</button>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[var(--primary)] opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl" />
            <p className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-2">Total Reports</p>
            <p className="text-4xl font-extrabold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>{stats.total}</p>
            <div className="mt-4 flex items-center text-xs font-bold text-[var(--success)]"><TrendingUp className="w-3 h-3 mr-1" /> All-time accumulated</div>
          </div>
          
          <div className="glass-card p-6 rounded-3xl shadow-xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[var(--success)] opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl" />
            <p className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-2">Resolved Incidents</p>
            <p className="text-4xl font-extrabold text-[var(--success)]" style={{ fontFamily: 'var(--font-display)' }}>{stats.resolved}</p>
            <div className="mt-4 flex items-center text-xs font-bold text-[var(--on-surface-variant)]">Completed municipal actions</div>
          </div>
          
          <div className="glass-card p-6 rounded-3xl shadow-xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[var(--blue)] opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl" />
            <p className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-2">Resolution Efficiency</p>
            <p className="text-4xl font-extrabold text-[var(--blue)]" style={{ fontFamily: 'var(--font-display)' }}>{stats.resolutionRate}%</p>
             <div className="mt-4 flex items-center text-xs font-bold text-[var(--on-surface-variant)]">Overall completion percentage</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Trend Map */}
          <div className="glass-card p-6 rounded-3xl shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-extrabold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>Report Influx Trajectory</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border-light)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--outline)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--outline)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--on-surface)' }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Issue Categories */}
          <div className="glass-card p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-6" style={{ fontFamily: 'var(--font-display)' }}>Categorical Breakdown</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border-light)" horizontal={false} />
                  <XAxis type="number" stroke="var(--outline)" fontSize={12} hide />
                  <YAxis dataKey="name" type="category" stroke="var(--outline)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <RechartsTooltip 
                    cursor={{fill: 'var(--glass-bg-hover)'}}
                    contentStyle={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20}>
                    {
                      stats.categoryData.map((_entry: { name: string; value: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operational Status */}
          <div className="glass-card p-6 rounded-3xl shadow-xl">
             <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-6" style={{ fontFamily: 'var(--font-display)' }}>Operational Phase Matrix</h3>
             <div className="h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.statusData.map((entry: { name: string; value: number; color: string }, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
