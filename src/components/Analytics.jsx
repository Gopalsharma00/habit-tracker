import React, { useState, useRef } from 'react';
import { Award, BarChart3, TrendingUp } from 'lucide-react';

const formatDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

export default function Analytics({ currentDate, habits, logs }) {
  const { year, month } = currentDate;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const containerRef = useRef(null);

  // Hover state for Monthly Trend Chart
  const [hoveredDayData, setHoveredDayData] = useState(null);

  // 1. Calculate Monthly Trend data (day-by-day)
  const monthlyData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(year, month, d);
    const checkedCount = logs[key] ? logs[key].length : 0;
    const totalPossible = habits.length;
    const pct = totalPossible > 0 ? Math.round((checkedCount / totalPossible) * 100) : 0;
    monthlyData.push({ day: d, pct, count: checkedCount });
  }

  // 2. Calculate Weekly Progress data
  // Divide month into 7-day chunks (Week 1: 1-7, Week 2: 8-14...)
  const weeklyData = [];
  let dayAccumulator = 0;
  let checkAccumulator = 0;
  let weekNum = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(year, month, d);
    const checkedCount = logs[key] ? logs[key].length : 0;
    checkAccumulator += checkedCount;
    dayAccumulator++;

    if (dayAccumulator === 7 || d === daysInMonth) {
      const totalPossibleInWeek = habits.length * dayAccumulator;
      const pct = totalPossibleInWeek > 0 ? Math.round((checkAccumulator / totalPossibleInWeek) * 100) : 0;
      weeklyData.push({
        label: `Wk ${weekNum}`,
        pct,
        count: checkAccumulator,
        days: dayAccumulator
      });
      weekNum++;
      dayAccumulator = 0;
      checkAccumulator = 0;
    }
  }

  // 3. Calculate Leaderboard (Top habits ranked by completion)
  const habitCompletionRates = habits.map(h => {
    let checkedDaysCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(year, month, d);
      if (logs[key] && logs[key].includes(h.id)) {
        checkedDaysCount++;
      }
    }
    const rate = daysInMonth > 0 ? Math.round((checkedDaysCount / daysInMonth) * 100) : 0;
    return { ...h, rate, count: checkedDaysCount };
  });

  // Sort by rate descending, limit to 10
  const sortedHabits = [...habitCompletionRates]
    .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name))
    .slice(0, 10);

  // Render SVG Area Chart
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Generate path points
  const points = monthlyData.map((d, index) => {
    const x = paddingLeft + (index / (daysInMonth - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.pct / 100) * chartHeight;
    return { x, y, data: d };
  });

  // Build the line path string
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    // Area path wraps back to the baseline (Y = paddingTop + chartHeight)
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Handle Chart Hover
  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX to SVG coordinates
    const scaleX = svgWidth / rect.width;
    const svgX = clientX * scaleX;

    // Find the closest point
    let closest = points[0];
    let minDiff = Math.abs(points[0].x - svgX);
    
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }
    
    setHoveredDayData(closest);
  };

  const handleMouseLeave = () => {
    setHoveredDayData(null);
  };

  return (
    <div className="analytics-layout">
      {/* Charts (Left side) */}
      <div className="charts-column">
        {/* Monthly Trend Area Chart */}
        <div className="glass-card" style={{ position: 'relative' }}>
          <div className="card-title-wrap">
            <h2>
              <TrendingUp size={18} style={{ color: 'var(--neon-cyan)' }} />
              Monthly Consistency Trend
            </h2>
            <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Daily Checked %
            </span>
          </div>

          <div 
            className="chart-card-inner" 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair' }}
          >
            {/* SVG Interactive Chart */}
            <svg 
              className="svg-chart" 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon-cyan)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon-purple)" stopOpacity="1" />
                  <stop offset="100%" stopColor="var(--neon-cyan)" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((val) => {
                const y = paddingTop + chartHeight - (val / 100) * chartHeight;
                return (
                  <g key={val}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={svgWidth - paddingRight} 
                      y2={y} 
                      stroke="var(--border-color)" 
                      strokeWidth="1" 
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      fill="var(--text-muted)" 
                      fontSize="10" 
                      fontFamily="var(--font-mono)" 
                      textAnchor="end"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Chart Paths */}
              {points.length > 0 && (
                <>
                  {/* Filled Area */}
                  <path d={areaPath} fill="url(#areaGradient)" />
                  
                  {/* Neon Top Line */}
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="var(--neon-cyan)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0px 0px 4px var(--neon-cyan-glow))' }}
                  />

                  {/* Day numbers on X axis (every 2-3 days for cleanliness) */}
                  {monthlyData.map((d, index) => {
                    if (d.day % 2 !== 1 && d.day !== daysInMonth) return null;
                    const x = paddingLeft + (index / (daysInMonth - 1)) * chartWidth;
                    return (
                      <text 
                        key={d.day} 
                        x={x} 
                        y={paddingTop + chartHeight + 20} 
                        fill="var(--text-muted)" 
                        fontSize="10" 
                        fontFamily="var(--font-mono)" 
                        textAnchor="middle"
                      >
                        {d.day}
                      </text>
                    );
                  })}
                </>
              )}

              {/* Hover Guide Line and Highlight Point */}
              {hoveredDayData && (
                <g>
                  {/* Vertical Line */}
                  <line 
                    x1={hoveredDayData.x} 
                    y1={paddingTop} 
                    x2={hoveredDayData.x} 
                    y2={paddingTop + chartHeight} 
                    stroke="rgba(0, 242, 254, 0.4)" 
                    strokeWidth="1" 
                    strokeDasharray="2 2"
                  />
                  {/* Outer glowing pulse dot */}
                  <circle 
                    cx={hoveredDayData.x} 
                    cy={hoveredDayData.y} 
                    r="8" 
                    fill="var(--neon-cyan)" 
                    opacity="0.3" 
                  />
                  {/* Inner solid dot */}
                  <circle 
                    cx={hoveredDayData.x} 
                    cy={hoveredDayData.y} 
                    r="4" 
                    fill="var(--text-primary)" 
                    stroke="var(--neon-cyan)" 
                    strokeWidth="2" 
                  />
                </g>
              )}
            </svg>

            {/* Custom Tooltip */}
            {hoveredDayData && (
              <div 
                className="chart-tooltip"
                style={{
                  left: `${(hoveredDayData.x / svgWidth) * 100}%`,
                  top: `${(hoveredDayData.y / svgHeight) * 100}%`
                }}
              >
                <div style={{ fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                  Day {hoveredDayData.data.day}
                </div>
                <div>Completions: {hoveredDayData.data.count} / {habits.length}</div>
                <div style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>
                  Consistency: {hoveredDayData.data.pct}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Progress Bar Chart */}
        <div className="glass-card">
          <div className="card-title-wrap">
            <h2>
              <BarChart3 size={18} style={{ color: 'var(--neon-purple)' }} />
              Weekly Progress
            </h2>
            <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Weekly Average
            </span>
          </div>

          <div className="chart-card-inner">
            {/* SVG Weekly Bar Chart */}
            <svg 
              className="svg-chart" 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid Lines */}
              {[0, 50, 100].map((val) => {
                const y = paddingTop + chartHeight - (val / 100) * chartHeight;
                return (
                  <g key={val}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={svgWidth - paddingRight} 
                      y2={y} 
                      stroke="var(--border-color)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      fill="var(--text-muted)" 
                      fontSize="10" 
                      fontFamily="var(--font-mono)" 
                      textAnchor="end"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {weeklyData.map((wk, index) => {
                const barSpan = chartWidth / weeklyData.length;
                const barWidth = Math.min(60, barSpan - 30);
                const x = paddingLeft + index * barSpan + (barSpan - barWidth) / 2;
                
                const barHeight = (wk.pct / 100) * chartHeight;
                const y = paddingTop + chartHeight - barHeight;

                return (
                  <g key={wk.label} className="bar-group">
                    {/* Background track bar */}
                    <rect 
                      x={x} 
                      y={paddingTop} 
                      width={barWidth} 
                      height={chartHeight} 
                      fill="rgba(255,255,255,0.02)" 
                      rx="4"
                    />
                    {/* Glowing neon bar */}
                    <rect 
                      x={x} 
                      y={y} 
                      width={barWidth} 
                      height={barHeight} 
                      fill="url(#barGradient)" 
                      rx="4"
                      style={{ 
                        transition: 'y 0.5s ease, height 0.5s ease',
                      }}
                    />
                    
                    {/* Week Label */}
                    <text 
                      x={x + barWidth / 2} 
                      y={paddingTop + chartHeight + 20} 
                      fill="var(--text-secondary)" 
                      fontSize="11" 
                      fontFamily="var(--font-mono)" 
                      textAnchor="middle"
                    >
                      {wk.label}
                    </text>
                    {/* Pct Label on top of bar */}
                    <text 
                      x={x + barWidth / 2} 
                      y={Math.min(y - 8, paddingTop + chartHeight - 8)} 
                      fill={wk.pct > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)'} 
                      fontSize="10" 
                      fontFamily="var(--font-mono)" 
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {wk.pct}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Leaderboard (Right side) */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-title-wrap">
          <h2>
            <Award size={18} style={{ color: 'var(--neon-green)' }} />
            Top 10 Daily Habits
          </h2>
          <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Ranked by completion %
          </span>
        </div>

        <ul className="leaderboard-list">
          {sortedHabits.map((habit, index) => (
            <li key={habit.id} className="leaderboard-item">
              <span className="leaderboard-rank">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leaderboard-icon">{habit.icon}</span>
              <span className="leaderboard-name">{habit.name}</span>
              
              <div className="leaderboard-progress-container">
                <div 
                  className="leaderboard-progress-bar"
                  style={{ width: `${habit.rate}%` }}
                />
              </div>

              <span className="leaderboard-pct">
                {habit.rate}%
              </span>
            </li>
          ))}
          {habits.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No habits configured. Go to settings to add habits.
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
