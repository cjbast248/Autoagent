import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToExcel, getExportFilename } from '@/utils/chartExport';
import { calculateCostFromSeconds } from '@/utils/costCalculations';
import { toast } from '@/hooks/use-toast';

type View = '24h' | 7 | 14 | 30;

type CallRow = { 
  call_date: string; 
  duration_seconds: number | null; 
  timestamps?: string | null;
  id?: string;
  contact_name?: string;
  call_status?: string;
};

type EnhancedDataPoint = {
  label: string;
  minutes: number;
  calls: number;
  avgDuration: number;
  estimatedCost: number;
  callDetails?: CallRow[];
};

const hours = Array.from({ length: 24 }, (_, h) => h);

const niceMax = (x: number) => {
  if (!isFinite(x) || x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const magnitude = Math.pow(10, exp);
  const norm = x / magnitude;
  let niceNorm = 1;
  if (norm <= 1) niceNorm = 1;
  else if (norm <= 2) niceNorm = 2;
  else if (norm <= 5) niceNorm = 5;
  else niceNorm = 10;
  return niceNorm * magnitude;
};

// Use local date keys to avoid UTC shift issues
const toLocalDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};


const VoiceChart: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [view, setView] = useState<View>('24h');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EnhancedDataPoint | null>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [showBrush, setShowBrush] = useState(false);

  // Fetch last 30 days once
  useEffect(() => {
    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data, error } = await supabase
          .from('call_history')
          .select('id, call_date, duration_seconds, timestamps, contact_name, call_status')
          .eq('user_id', user.id)
          .gte('call_date', since.toISOString())
          .order('call_date', { ascending: true });
        if (error) throw error;
        setRows(
          (data as any[])?.map(r => ({ 
            id: r.id,
            call_date: r.call_date, 
            duration_seconds: r.duration_seconds, 
            timestamps: r.timestamps,
            contact_name: r.contact_name,
            call_status: r.call_status
          })) || []
        );
      } catch (e: any) {
        console.error('Fetch voice minutes failed:', e);
        setError('Nu s-au putut încărca datele');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

  // Helper: duration in seconds (fallback to timestamps when missing)
  const getSeconds = (r: CallRow) => {
    if (r.duration_seconds && r.duration_seconds > 0) return r.duration_seconds;
    const t = r.timestamps || '';
    // try to parse two ISO-like timestamps separated by non-digit chars
    const m = t.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?).*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
    if (m) {
      const start = new Date(m[1]);
      const end = new Date(m[2]);
      const secs = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
      return secs;
    }
    return 0;
  };

  // Build enhanced chart data with detailed metrics
  const { chartData, xKey, subtitle } = useMemo(() => {
    console.log('🔍 Building chart data, rows:', rows.length);
    const end = new Date();
    if (view === '24h') {
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      const buckets: EnhancedDataPoint[] = hours.map(h => ({
        label: `${String(h).padStart(2, '0')}:00`,
        minutes: 0,
        calls: 0,
        avgDuration: 0,
        estimatedCost: 0,
        callDetails: []
      }));
      
      for (const r of rows) {
        if (!r.call_date) continue;
        const d = new Date(r.call_date);
        if (d < start || d > end) continue;
        const hour = d.getHours();
        const secs = getSeconds(r);
        let minutes = Math.round(secs / 60);
        if (secs > 0 && minutes === 0) minutes = 1;
        
        buckets[hour].minutes += minutes;
        buckets[hour].calls += 1;
        buckets[hour].estimatedCost += calculateCostFromSeconds(secs);
        buckets[hour].callDetails?.push(r);
      }
      
      // Calculate average durations
      buckets.forEach(bucket => {
        if (bucket.calls > 0) {
          bucket.avgDuration = bucket.minutes / bucket.calls;
        }
      });
      
      return {
        chartData: buckets,
        xKey: 'label' as const,
        subtitle: t('dashboard.distributionLast24h'),
      };
    }
    
    // daily totals for last N days
    const days = view as 7 | 14 | 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const endDay = new Date();
    endDay.setHours(23, 59, 59, 999);
    const dayKeys: string[] = [];
    const labels: string[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = toLocalDateKey(d);
        dayKeys.push(key);
        labels.push(d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }));
      }
    
    const map: Record<string, EnhancedDataPoint> = Object.fromEntries(
      dayKeys.map((k, i) => [k, {
        label: labels[i],
        minutes: 0,
        calls: 0,
        avgDuration: 0,
        estimatedCost: 0,
        callDetails: []
      }])
    );
    
    for (const r of rows) {
      if (!r.call_date) continue;
      const d = new Date(r.call_date);
      if (d < start || d > endDay) continue;
      const key = toLocalDateKey(d);
      const secs = getSeconds(r);
      let minutes = Math.round(secs / 60);
      if (secs > 0 && minutes === 0) minutes = 1;
      
      if (map[key]) {
        map[key].minutes += minutes;
        map[key].calls += 1;
        map[key].estimatedCost += calculateCostFromSeconds(secs);
        map[key].callDetails?.push(r);
      }
    }
    
    // Calculate average durations
    Object.values(map).forEach(point => {
      if (point.calls > 0) {
        point.avgDuration = point.minutes / point.calls;
      }
    });
    
    const data = dayKeys.map(k => map[k]);
    console.log('📊 Chart data for last', days, 'days:', data);
    console.log('📊 Total minutes:', data.reduce((sum, d) => sum + d.minutes, 0));
    return { chartData: data, xKey: 'label' as const, subtitle: `Minute pe zi · ultimele ${days} zile` };
  }, [rows, view]);

  const maxMinutes = Math.max(1, ...chartData.map((d: any) => d.minutes));

  const getViewLabel = (view: View): string => {
    if (view === '24h') return t('dashboard.24hours') || '24 ore';
    return `${view} ${t('dashboard.days') || 'zile'}`;
  };

  // Export handlers
  const handleExportCSV = () => {
    const filename = getExportFilename('voice-data', 'csv');
    exportToCSV(chartData as any, filename);
    toast({
      title: '✅ Export Reușit',
      description: `Datele au fost exportate în ${filename}`,
    });
  };

  const handleExportExcel = () => {
    const filename = getExportFilename('voice-data', 'xls');
    exportToExcel(chartData as any, filename);
    toast({
      title: '✅ Export Reușit',
      description: `Datele au fost exportate în ${filename}`,
    });
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setShowBrush(!showBrush);
    toast({
      title: showBrush ? '🔍 Zoom Dezactivat' : '🔍 Zoom Activat',
      description: showBrush 
        ? 'Vizualizare normală restaurată' 
        : 'Folosește bara de dedesubt pentru a face zoom pe o perioadă specifică',
    });
  };

  const handleResetZoom = () => {
    setZoomDomain(null);
    setShowBrush(false);
    toast({
      title: '🔄 Reset Zoom',
      description: 'Vizualizarea a fost resetată',
    });
  };

  return (
  <Card className="rounded-2xl border border-gray-100 shadow-none bg-white">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-semibold text-gray-900 text-base">
              {t('dashboard.minuteChart')}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
            {(['24h', 7, 14, 30] as View[]).map((d) => (
              <button
                key={d}
                onClick={() => setView(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  view === d
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {getViewLabel(d)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Control Buttons - Minimal */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleZoomIn}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {showBrush ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
            <span>{showBrush ? 'Dezactivare Zoom' : 'Activare Zoom'}</span>
          </button>
          
          {(showBrush || zoomDomain) && (
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
          
          <div className="flex-1" />
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 bg-white">
        <div className={`${showBrush ? 'h-[350px]' : 'h-[400px]'} w-full bg-white rounded-xl transition-all duration-300`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              key={String(view)} 
              data={chartData} 
              margin={{ top: 10, right: 16, left: 0, bottom: showBrush ? 30 : 8 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  setSelectedPoint(data.activePayload[0].payload as EnhancedDataPoint);
                }
              }}
            >
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000000" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#000000" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#666666' }}
                interval={view === '24h' ? 0 : (chartData.length >= 30 ? 2 : chartData.length >= 14 ? 1 : 0)}
                minTickGap={12}
              />
              
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#666666' }}
                domain={[0, (dataMax: number) => niceMax(Math.max(dataMax, maxMinutes))]}
                tickCount={5}
                tickFormatter={(v: number) => `${v}m`}
              />
              
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as EnhancedDataPoint;
                  
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg min-w-[220px]">
                      <p className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">
                        {label}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Minute vorbite:</span>
                          <span className="text-sm font-semibold text-gray-900">{data.minutes}m</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Apeluri:</span>
                          <span className="text-sm font-semibold text-blue-600">{data.calls}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Durată medie:</span>
                          <span className="text-sm font-medium text-gray-700">{data.avgDuration.toFixed(1)}m</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-600">Cost estimat:</span>
                          <span className="text-sm font-semibold text-emerald-600">${data.estimatedCost.toFixed(4)}</span>
                        </div>
                      </div>
                      
                      {data.calls > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 italic">Click pentru detalii</p>
                        </div>
                      )}
                    </div>
                  );
                }}
                cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              
              <Area
                type="monotone"
                dataKey="minutes"
                stroke="#000000"
                strokeWidth={2}
                fill="url(#colorMinutes)"
                fillOpacity={1}
                activeDot={{ 
                  r: 6, 
                  fill: '#000000', 
                  stroke: '#ffffff', 
                  strokeWidth: 2,
                  style: { cursor: 'pointer' }
                }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
              
              {showBrush && (
                <Brush
                  dataKey={xKey}
                  height={30}
                  stroke="#000000"
                  fill="#f9fafb"
                  travellerWidth={10}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Selected Point Details */}
        {selectedPoint && selectedPoint.calls > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Detalii pentru {selectedPoint.label}
              </h4>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Apeluri</p>
                <p className="text-lg font-bold text-gray-900">{selectedPoint.calls}</p>
              </div>
              
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Minute</p>
                <p className="text-lg font-bold text-gray-900">{selectedPoint.minutes}</p>
              </div>
              
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Medie/Apel</p>
                <p className="text-lg font-bold text-gray-900">{selectedPoint.avgDuration.toFixed(1)}m</p>
              </div>
              
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Cost</p>
                <p className="text-lg font-bold text-emerald-600">${selectedPoint.estimatedCost.toFixed(2)}</p>
              </div>
            </div>
            
            {selectedPoint.callDetails && selectedPoint.callDetails.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Apeluri recente:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedPoint.callDetails.slice(0, 5).map((call, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-100">
                      <span className="font-medium text-gray-700 truncate">
                        {call.contact_name || 'Necunoscut'}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {call.call_status}
                      </span>
                    </div>
                  ))}
                  {selectedPoint.callDetails.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-1">
                      +{selectedPoint.callDetails.length - 5} mai multe
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceChart;