import React, { useState, useMemo } from 'react';
import {
  ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const fmtDisplayDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();
};

const getWeekKey = (dateStr) => {
  const d   = new Date(dateStr);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return mon.toISOString().split('T')[0];
};

const countWeeks = (trades, graph) => {
  const keys = new Set();
  trades.forEach(t => keys.add(getWeekKey(t.EntryDate || t.entrytime || '')));
  if (!keys.size) graph.forEach(g => keys.add(getWeekKey(g.tradingdate)));
  return keys.size;
};

const recomputeSummary = (trades, graph) => {
  if (!trades.length && !graph.length) return null;
  const totalWeeks = countWeeks(trades, graph);
  const weekMap = {};
  trades.forEach(t => {
    const key = getWeekKey(t.EntryDate || t.entrytime || '');
    if (!weekMap[key]) weekMap[key] = 0;
    weekMap[key] += parseFloat(t['P/L'] ?? t.pl ?? t.PL ?? 0);
  });
  const weeklyPnls   = Object.values(weekMap);
  const successWeeks = weeklyPnls.filter(p => p > 0).length;
  const failureWeeks = weeklyPnls.filter(p => p <= 0).length;
  const allPnls      = trades.map(t => parseFloat(t['P/L'] ?? t.pl ?? t.PL ?? 0));
  const totalPnl     = allPnls.reduce((a, b) => a + b, 0);
  const capital      = graph.length ? graph[0].cummulativepl : 0;
  const grossPct     = capital ? ((totalPnl / capital) * 100) : 0;
  return {
    TotalWeeks:          totalWeeks,
    Success:             successWeeks,
    Success_per:         totalWeeks ? Math.round((successWeeks / totalWeeks) * 100) : 0,
    Failure:             failureWeeks,
    Failure_per:         totalWeeks ? Math.round((failureWeeks / totalWeeks) * 100) : 0,
    GrossProfitLoss:     parseFloat(totalPnl.toFixed(2)),
    GrossProfitLoss_per: parseFloat(grossPct.toFixed(2)),
  };
};

const recomputeMetrics = (trades, graph) => {
  const pnls    = trades.map(t => parseFloat(t['P/L'] ?? t.pl ?? t.PL ?? 0));
  const profits = pnls.filter(p => p > 0);
  const losses  = pnls.filter(p => p < 0);
  const avgProfit = profits.length ? parseFloat((profits.reduce((a, b) => a + b, 0) / profits.length).toFixed(2)) : 0;
  const avgLoss   = losses.length  ? parseFloat((losses.reduce((a, b) => a + b, 0)  / losses.length).toFixed(2))  : 0;
  let maxConsecLoss = 0, curConsec = 0;
  pnls.forEach(p => {
    if (p < 0) { curConsec += p; maxConsecLoss = Math.min(maxConsecLoss, curConsec); }
    else curConsec = 0;
  });
  const weekMap = {};
  trades.forEach(t => {
    const key = getWeekKey(t.EntryDate || t.entrytime || '');
    if (!weekMap[key]) weekMap[key] = 0;
    weekMap[key] += parseFloat(t['P/L'] ?? t.pl ?? t.PL ?? 0);
  });
  const weeklyPnls    = Object.values(weekMap);
  const maxProfitWeek = weeklyPnls.length ? Math.max(...weeklyPnls) : 0;
  const maxLossWeek   = weeklyPnls.length ? Math.min(...weeklyPnls) : 0;
  const cummMaxProfit = profits.reduce((a, b) => a + b, 0);
  const cummMaxLoss   = losses.reduce((a, b) => a + b, 0);
  let sharpe = 0;
  if (graph.length > 1) {
    const dr = [];
    for (let i = 1; i < graph.length; i++) dr.push(graph[i].cummulativepl - graph[i - 1].cummulativepl);
    const mean = dr.reduce((a, b) => a + b, 0) / dr.length;
    const std  = Math.sqrt(dr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dr.length);
    sharpe = std !== 0 ? parseFloat((mean / std).toFixed(2)) : 0;
  }
  const maxProfitSingle = pnls.length ? Math.max(...pnls) : 0;
  const maxLossSingle   = pnls.length ? Math.min(...pnls) : 0;
  const riskReward      = losses.length && profits.length ? parseFloat((Math.abs(avgProfit) / Math.abs(avgLoss)).toFixed(2)) : 0;
  return { avgProfit, avgLoss, maxConsecLoss: parseFloat(maxConsecLoss.toFixed(2)), maxProfitWeek: parseFloat(maxProfitWeek.toFixed(2)), maxLossWeek: parseFloat(maxLossWeek.toFixed(2)), cummMaxProfit: parseFloat(cummMaxProfit.toFixed(2)), cummMaxLoss: parseFloat(cummMaxLoss.toFixed(2)), sharpe, maxProfitSingle: parseFloat(maxProfitSingle.toFixed(2)), maxLossSingle: parseFloat(maxLossSingle.toFixed(2)), riskReward };
};

const getColor = (val) => {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '#10B981';
  return n < 0 ? '#EF4444' : '#10B981';
};

const Card = ({ label, value, color }) => (
  <div style={{ background: '#F0F4FA', border: '1px solid #E2E8F0', borderRadius: 12, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', color: '#64748B', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 22, fontWeight: 800, color: color, lineHeight: 1 }}>{value}</span>
  </div>
);

const EquityTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const cumPL    = payload.find(p => p.dataKey === 'cummulativepl');
  const undPrice = payload.find(p => p.dataKey === 'underlyingprice');
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 13, minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      <div style={{ color: '#94a3b8', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>{label}</div>
      {cumPL && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>Cumulative PL</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: cumPL.value >= 0 ? '#34d399' : '#f87171' }}>{cumPL.value >= 0 ? '▲' : '▼'} {Math.abs(cumPL.value).toLocaleString('en-IN')}</span>
        </div>
      )}
      {undPrice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>Underlying Price</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#93c5fd' }}>{undPrice.value?.toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
};

const DrawdownTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 13 }}>
      <div style={{ color: '#94a3b8', marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#f87171' }}>{typeof val === 'number' ? val.toLocaleString('en-IN') : val}</div>
    </div>
  );
};

const BacktestResults = ({ backtestResponse, fromDate, toDate, onModify, onNewBacktest }) => {
  const [activeTab, setActiveTab]     = useState('metrics');
  const [tradeSearch, setTradeSearch] = useState('');
  const [pageSize, setPageSize]       = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const graph  = backtestResponse?.Graph  || [];
  const trades = backtestResponse?.Trades || [];

  const summary     = useMemo(() => recomputeSummary(trades, graph), [trades, graph]);
  const m           = useMemo(() => recomputeMetrics(trades, graph), [trades, graph]);
  const maxDrawdown = graph.length ? Math.min(...graph.map(d => d.dradown_day)) : 0;
  const dateLabel   = `${fmtDisplayDate(fromDate)} - ${fmtDisplayDate(toDate)}`;

  const searched = useMemo(() => {
    if (!tradeSearch.trim()) return trades;
    const q = tradeSearch.toLowerCase();
    return trades.filter(t => Object.values(t).some(v => String(v).toLowerCase().includes(q)));
  }, [trades, tradeSearch]);

  const totalPages  = Math.max(1, Math.ceil(searched.length / pageSize));
  const pagedTrades = searched.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    if (!trades.length) return;
    const headers = Object.keys(trades[0]).join(',');
    const rows    = trades.map(t => Object.values(t).map(v => `"${v}"`).join(',')).join('\n');
    const blob    = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `tradelog_${fromDate}_${toDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!backtestResponse) return null;

  const tabBtn = (tab, label) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{ padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s', background: activeTab === tab ? '#16a34a' : 'transparent', color: activeTab === tab ? '#fff' : '#6B7280' }}
    >{label}</button>
  );

  return (
    <div style={{ marginTop: 24, fontFamily: "'Inter', 'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:px-6" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 15 }}>📊</span>
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Backtest Results</span>
              <span className="hidden sm:inline" style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginLeft: 8 }}>{dateLabel}</span>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="text-xs sm:text-sm"
            style={{ border: '1.5px solid #CBD5E1', background: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#374151'; }}
          >⬇ Export TradeLog</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 sm:px-6 py-3 overflow-x-auto" style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFBFD' }}>
          {tabBtn('metrics',  'Metrics')}
          {tabBtn('equity',   'Equity Curve')}
          {tabBtn('tradelog', 'Trade Log')}
        </div>

        {/* METRICS TAB */}
        {activeTab === 'metrics' && (
          <div className="p-4 sm:p-6">
            {!trades.length && !graph.length ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                No data available
              </div>
            ) : (
              <>
                {/* Responsive metric rows - 2 cols mobile, 4 cols desktop */}
                {[
                  [
                    { label: "Total Weeks",       value: summary?.TotalWeeks ?? 0,                                                  color: getColor(summary?.TotalWeeks) },
                    { label: "Success",           value: `${summary?.Success ?? 0}(${summary?.Success_per ?? 0}%)`,                 color: "#10B981" },
                    { label: "Failure",           value: `${summary?.Failure ?? 0}(${summary?.Failure_per ?? 0}%)`,                 color: (summary?.Failure ?? 0) > 0 ? '#EF4444' : '#10B981' },
                    { label: "Gross Profit/Loss", value: `${summary?.GrossProfitLoss ?? 0}(${summary?.GrossProfitLoss_per ?? 0}%)`, color: getColor(summary?.GrossProfitLoss) },
                  ],
                  [
                    { label: "Avg Trade Profit",    value: m.avgProfit,     color: getColor(m.avgProfit) },
                    { label: "Avg Trade Loss",      value: m.avgLoss,       color: getColor(m.avgLoss) },
                    { label: "Consecutive Max Loss",value: m.maxConsecLoss, color: getColor(m.maxConsecLoss) },
                    { label: "Max Profit Per Week", value: m.maxProfitWeek, color: getColor(m.maxProfitWeek) },
                  ],
                  [
                    { label: "Max Loss Per Week",       value: m.maxLossWeek,   color: getColor(m.maxLossWeek) },
                    { label: "Cummulative Max Profit",  value: m.cummMaxProfit, color: getColor(m.cummMaxProfit) },
                    { label: "Cummulative Max Loss",    value: m.cummMaxLoss,   color: getColor(m.cummMaxLoss) },
                    { label: "Sharpe (Daily) Ratio",    value: m.sharpe,        color: getColor(m.sharpe) },
                  ],
                  [
                    { label: "Max Profit in Single Trade", value: m.maxProfitSingle, color: getColor(m.maxProfitSingle) },
                    { label: "Max Loss in Single Trade",   value: m.maxLossSingle,   color: getColor(m.maxLossSingle) },
                    { label: "Risk Reward Ratio",          value: m.riskReward,      color: getColor(m.riskReward) },
                  ],
                ].map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {row.map((card, i) => <Card key={i} label={card.label} value={card.value} color={card.color} />)}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* EQUITY CURVE TAB */}
        {activeTab === 'equity' && (
          <div className="p-4 sm:p-6">
            {graph.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
                No graph data available
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Equity Curve */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 16 }}>📈</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>Equity Curve</span>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: '16px 8px', border: '1px solid #E9EFF6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 18 }}>📈</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Equity Curve Performance</span>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={graph} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="tradingdate" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} interval="preserveStartEnd" />
                        <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => v.toLocaleString('en-IN')} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => v.toLocaleString('en-IN')} />
                        <Tooltip content={<EquityTooltip />} />
                        <Area yAxisId="left" type="monotone" dataKey="cummulativepl" stroke="#ef4444" strokeWidth={2} fill="url(#eqFill)" dot={false} activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                        <Line yAxisId="right" type="monotone" dataKey="underlyingprice" stroke="#6366f1" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Drawdown */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 16px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 16 }}>📉</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>Drawdown</span>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: '16px 8px', border: '1px solid #E9EFF6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>📉</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Drawdown Analysis</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
                      Portfolio Risk Metrics •{' '}
                      <span style={{ color: '#EF4444', fontWeight: 600 }}>Max Drawdown: {maxDrawdown.toLocaleString('en-IN')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={graph} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="tradingdate" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => v.toLocaleString('en-IN')} />
                        <Tooltip content={<DrawdownTooltip />} />
                        <Area type="monotone" dataKey="dradown_day" stroke="#ef4444" strokeWidth={2} fill="url(#ddFill)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRADE LOG TAB */}
        {activeTab === 'tradelog' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer' }}
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span style={{ fontSize: 13, color: '#6B7280' }}>entries per page</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>Search:</span>
                <input
                  type="text" value={tradeSearch}
                  onChange={e => { setTradeSearch(e.target.value); setCurrentPage(1); }}
                  className="w-36 sm:w-48"
                  style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 12px', fontSize: 13, outline: 'none' }}
                />
              </div>
            </div>

            {searched.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                No trades available
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {[
                        { key: 'seqno', label: 'SEQNO' }, { key: 'symbol', label: 'SYMBOL' },
                        { key: 'entrytime', label: 'ENTRYTIME' }, { key: 'exittime', label: 'EXITTIME' },
                        { key: 'direction', label: 'DIRECTION' }, { key: 'entryprice', label: 'ENTRYPRICE' },
                        { key: 'exitprice', label: 'EXITPRICE' }, { key: 'qty', label: 'QTY' },
                        { key: 'pl', label: 'PL' }, { key: 'exitreason', label: 'EXITREASON' },
                      ].map(col => (
                        <th key={col.key} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                          {col.label} <span style={{ color: '#CBD5E1', fontSize: 9 }}>⇅</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTrades.map((t, idx) => {
                      const seqNo      = (currentPage - 1) * pageSize + idx + 1;
                      const symbol     = t.Symbol     || t.symbol     || `${t.Strike || ''}${t.Type || ''}` || '—';
                      const entryTime  = (() => { const ed = t.EntryDate?.split('T')[0] || ''; const et = t.EntryTime || ''; return ed && et ? `${ed} ${et}` : ed || et || t.entrytime || '—'; })();
                      const exitTime   = (() => { const xd = t.ExitDate?.split('T')[0]  || ''; const xt = t.ExitTime  || ''; return xd && xt ? `${xd} ${xt}` : xd || xt || t.exittime  || '—'; })();
                      const direction  = t['B/S'] || t.direction || t.BuySell || '—';
                      const entryPrice = parseFloat(t.EntryPrice ?? t.entryprice ?? 0).toFixed(2);
                      const exitPrice  = parseFloat(t.ExitPrice  ?? t.exitprice  ?? 0).toFixed(2);
                      const qty        = t.Qty    || t.qty || '—';
                      const pl         = parseFloat(t['P/L'] ?? t.pl ?? t.PL ?? 0);
                      const exitReason = t.ExitReason || t.exitreason || t.ExitType || '—';
                      const dir        = String(direction).toUpperCase();
                      const rowBg      = idx % 2 === 0 ? '#fff' : '#FAFBFD';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: rowBg }}
                          onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                          onMouseLeave={e => e.currentTarget.style.background = rowBg}
                        >
                          <td style={{ padding: '10px', color: '#374151', fontWeight: 600 }}>{seqNo}</td>
                          <td style={{ padding: '10px', color: '#374151', whiteSpace: 'nowrap', fontWeight: 500 }}>{symbol}</td>
                          <td style={{ padding: '10px', color: '#374151', whiteSpace: 'nowrap', fontSize: 12 }}>{entryTime}</td>
                          <td style={{ padding: '10px', color: '#374151', whiteSpace: 'nowrap', fontSize: 12 }}>{exitTime}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, background: dir === 'BUY' ? '#DCFCE7' : '#FEE2E2', color: dir === 'BUY' ? '#16A34A' : '#DC2626', border: `1px solid ${dir === 'BUY' ? '#BBF7D0' : '#FECACA'}` }}>
                              {dir || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#374151', fontWeight: 500 }}>{entryPrice}</td>
                          <td style={{ padding: '10px', color: '#374151', fontWeight: 500 }}>{exitPrice}</td>
                          <td style={{ padding: '10px', color: '#374151' }}>{qty}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: pl >= 0 ? '#16A34A' : '#DC2626' }}>{pl.toFixed(2)}</td>
                          <td style={{ padding: '10px', color: '#64748B', fontSize: 11 }}>{exitReason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {searched.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, searched.length)} to {Math.min(currentPage * pageSize, searched.length)} of {searched.length} entries
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { label: '«', fn: () => setCurrentPage(1),                                     dis: currentPage === 1 },
                    { label: '‹', fn: () => setCurrentPage(p => Math.max(1, p - 1)),               dis: currentPage === 1 },
                    ...Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pg = i + 1;
                      if (totalPages > 5) pg = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return { label: String(pg), fn: () => setCurrentPage(pg), active: pg === currentPage };
                    }),
                    { label: '›', fn: () => setCurrentPage(p => Math.min(totalPages, p + 1)),     dis: currentPage === totalPages },
                    { label: '»', fn: () => setCurrentPage(totalPages),                            dis: currentPage === totalPages },
                  ].map((btn, i) => (
                    <button key={i} onClick={btn.fn} disabled={btn.dis} style={{ width: 34, height: 34, borderRadius: 8, border: btn.active ? 'none' : '1px solid #E2E8F0', background: btn.active ? '#1D4ED8' : '#fff', color: btn.active ? '#fff' : btn.dis ? '#CBD5E1' : '#374151', cursor: btn.dis ? 'not-allowed' : 'pointer', fontWeight: btn.active ? 700 : 500, fontSize: 13 }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-8 mb-4 px-4">
        <button
          onClick={onModify}
          className="w-full sm:w-auto"
          style={{ background: '#fff', color: '#374151', border: '1.5px solid #CBD5E1', borderRadius: 10, padding: '13px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#374151'; }}
        >✏️ Modify Strategy</button>
        <button
          onClick={onNewBacktest}
          className="w-full sm:w-auto"
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >+ New Backtest</button>
      </div>
    </div>
  );
};

export default BacktestResults;