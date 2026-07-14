import React from 'react';
import { Settings, Flame, Award, TrendingUp, Calendar, Plus } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Header({ 
  currentDate, 
  setCurrentDate, 
  onOpenSettings, 
  stats 
}) {
  const { year, month } = currentDate;

  const handleMonthChange = (e) => {
    setCurrentDate({ ...currentDate, month: parseInt(e.target.value) });
  };

  const handleYearChange = (e) => {
    setCurrentDate({ ...currentDate, year: parseInt(e.target.value) });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="header-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Branding and Controls */}
      <div className="header-wrapper glass-card">
        <div className="branding">
          <h1 className="title-main">
            The Art of Consistency
            <span role="img" aria-label="chart">📈</span>
          </h1>
          <div className="subtitle">Interactive Habit Dashboard</div>
        </div>

        <div className="controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} className="text-secondary" style={{ color: 'var(--neon-cyan)' }} />
            <select 
              value={month} 
              onChange={handleMonthChange} 
              className="select-custom"
              id="month-select"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
            
            <select 
              value={year} 
              onChange={handleYearChange} 
              className="select-custom"
              id="year-select"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn" 
            onClick={onOpenSettings} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem',
              fontSize: '0.8rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(0, 242, 254, 0.15)',
              color: 'var(--neon-cyan)',
              border: '1px solid var(--neon-cyan)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-mono)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--neon-cyan)';
              e.currentTarget.style.color = 'var(--bg-main)';
              e.currentTarget.style.boxShadow = '0 0 12px var(--neon-cyan-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 254, 0.15)';
              e.currentTarget.style.color = 'var(--neon-cyan)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            id="settings-btn"
          >
            <Plus size={16} />
            <span className="add-remove-text">Add/Remove Habits</span>
          </button>
        </div>
      </div>

      {/* Metrics Dashboard Row */}
      <div className="metrics-row">
        {/* Total Completion Rate */}
        <div className="metric-card glass-card" style={{ '--accent-color': 'var(--neon-cyan)' }}>
          <div className="metric-label">Monthly Completion</div>
          <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            {stats.completionRate}%
            <TrendingUp size={18} style={{ color: 'var(--neon-cyan)', marginLeft: '0.5rem' }} />
          </div>
          <div className="metric-sub">{stats.totalChecked} of {stats.totalPossible} slots checked</div>
        </div>

        {/* Current Active Streak */}
        <div className="metric-card glass-card" style={{ '--accent-color': 'var(--neon-pink)' }}>
          <div className="metric-label">Current Streak</div>
          <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            {stats.currentStreak} Days
            <Flame size={18} style={{ color: 'var(--neon-pink)', marginLeft: '0.5rem' }} />
          </div>
          <div className="metric-sub">Consecutive active days</div>
        </div>

        {/* Best Habit */}
        <div className="metric-card glass-card" style={{ '--accent-color': 'var(--neon-green)' }}>
          <div className="metric-label">Best Habit</div>
          <div className="metric-value" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '1.4rem', lineHeight: '2.2rem' }}>
            {stats.bestHabit ? `${stats.bestHabit.icon} ${stats.bestHabit.name}` : 'N/A'}
          </div>
          <div className="metric-sub">
            {stats.bestHabit ? `${stats.bestHabit.rate}% completion` : 'Track habits to calculate'}
          </div>
        </div>

        {/* Active Habits Count */}
        <div className="metric-card glass-card" style={{ '--accent-color': 'var(--neon-purple)' }}>
          <div className="metric-label">Active Habits</div>
          <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            {stats.activeHabitsCount} Habits
            <Award size={18} style={{ color: 'var(--neon-purple)', marginLeft: '0.5rem' }} />
          </div>
          <div className="metric-sub">Currently tracking</div>
        </div>
      </div>
    </div>
  );
}
