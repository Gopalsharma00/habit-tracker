import React, { useState } from 'react';
import { CalendarRange, Eye, EyeOff } from 'lucide-react';

// Helper to format date key as YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

export default function HabitGrid({ 
  currentDate, 
  habits, 
  logs, 
  onToggleHabit,
  onToggleAllDay
}) {
  const { year, month } = currentDate;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // 1. Mobile Responsiveness: View Mode State
  // 'month' shows all days; 'week' shows 7 days at a time
  const [viewMode, setViewMode] = useState('month'); 
  const [activeWeek, setActiveWeek] = useState(1);

  // Track hovered cell to draw guidelines
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate weekday headers and day numbers
  const allDays = [];
  const weekGroups = []; // Array of { label: 'WEEK X', span: number, weekNum: number }

  let currentSpan = 0;
  let currentWeekNum = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }); // Sun, Mon...
    const isWeekend = dayName === 'Sat' || dayName === 'Sun';
    allDays.push({ dayNum: d, dayName, isWeekend });
    
    currentSpan++;
    // End week group every 7 days or at the end of the month
    if (currentSpan === 7 || d === daysInMonth) {
      weekGroups.push({
        label: `WEEK ${currentWeekNum}`,
        span: currentSpan,
        weekNum: currentWeekNum
      });
      currentWeekNum++;
      currentSpan = 0;
    }
  }

  // Filter days based on View Mode
  let displayedDays = allDays;
  let displayedWeekGroups = weekGroups;

  if (viewMode === 'week') {
    const startDay = (activeWeek - 1) * 7 + 1;
    const endDay = Math.min(activeWeek * 7, daysInMonth);
    displayedDays = allDays.filter(d => d.dayNum >= startDay && d.dayNum <= endDay);
    
    // Only show the single active week label spanning the displayed columns
    displayedWeekGroups = [{
      label: `WEEK ${activeWeek}`,
      span: displayedDays.length,
      weekNum: activeWeek
    }];
  }

  // Calculate grid template columns dynamically using CSS variables for flexibility
  const gridStyle = {
    gridTemplateColumns: `var(--habit-col-width, 220px) var(--goal-col-width, 60px) repeat(${displayedDays.length}, minmax(36px, 1fr)) var(--done-col-width, 60px) var(--pct-col-width, 70px)`
  };

  // Helper to check if a habit is logged for a specific day
  const isHabitChecked = (habitId, day) => {
    const key = formatDateKey(year, month, day);
    return logs[key] ? logs[key].includes(habitId) : false;
  };

  // Check if all habits are checked on a given day
  const isDayAllChecked = (day) => {
    if (habits.length === 0) return false;
    return habits.every(h => isHabitChecked(h.id, day));
  };

  // Check if some (but not all) habits are checked on a given day (indeterminate state)
  const isDayPartiallyChecked = (day) => {
    if (habits.length === 0) return false;
    const checkedCount = habits.filter(h => isHabitChecked(h.id, day)).length;
    return checkedCount > 0 && checkedCount < habits.length;
  };

  // Calculate completions for a single habit in this month
  const getHabitCompletionStats = (habitId) => {
    let checkedCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (isHabitChecked(habitId, d)) {
        checkedCount++;
      }
    }
    const percent = daysInMonth > 0 ? Math.round((checkedCount / daysInMonth) * 100) : 0;
    return { checkedCount, percent };
  };

  // Calculate daily summary completions
  const getDailyCompletionCount = (day) => {
    const key = formatDateKey(year, month, day);
    return logs[key] ? logs[key].filter(id => habits.some(h => h.id === id)).length : 0;
  };

  const getDailyCompletionPercent = (day) => {
    const count = getDailyCompletionCount(day);
    if (habits.length === 0) return 0;
    return Math.round((count / habits.length) * 100);
  };

  const getPctClass = (pct) => {
    if (pct === 100) return 'pct-high';
    if (pct >= 50) return 'pct-medium';
    if (pct > 0) return 'pct-low';
    return 'pct-none';
  };

  // Toggle "Select All" for a column
  const handleToggleSelectAllDay = (day) => {
    const key = formatDateKey(year, month, day);
    const currentlyAllChecked = isDayAllChecked(day);
    // If currently all checked, we uncheck all. Otherwise, we check all.
    onToggleAllDay(key, !currentlyAllChecked);
  };

  return (
    <div className="glass-card spreadsheet-card">
      
      {/* Header controls for view modes & mobile responsiveness */}
      <div className="spreadsheet-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarRange size={18} style={{ color: 'var(--neon-cyan)' }} />
            Monthly Overview
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Daily checklists and alignment guides
          </span>
        </div>

        {/* Weekly vs Monthly selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          
          {/* Week Selector Tab (only when viewMode is 'week') */}
          {viewMode === 'week' && (
            <div className="week-selector-bar" style={{ display: 'flex', background: 'var(--bg-main)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {weekGroups.map((g) => (
                <button
                  key={g.weekNum}
                  onClick={() => setActiveWeek(g.weekNum)}
                  className={`btn-week-tab ${activeWeek === g.weekNum ? 'active' : ''}`}
                  style={{
                    padding: '0.25rem 0.5rem',
                    border: 'none',
                    background: activeWeek === g.weekNum ? 'var(--border-color-glow)' : 'transparent',
                    color: activeWeek === g.weekNum ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  W{g.weekNum}
                </button>
              ))}
            </div>
          )}

          {/* Toggle buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setViewMode('month'); }}
              className="btn-toggle-view"
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: viewMode === 'month' ? 'var(--border-color-glow)' : 'transparent',
                color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Month View
            </button>
            <button
              onClick={() => { setViewMode('week'); }}
              className="btn-toggle-view"
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: viewMode === 'week' ? 'var(--border-color-glow)' : 'transparent',
                color: viewMode === 'week' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Week View
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="spreadsheet-container">
        <div className="habit-grid" style={gridStyle}>
          
          {/* Row 1: Week Labels */}
          <div className="header-row">
            <div className="grid-cell habit-info-cell header-cell-main" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
            {displayedWeekGroups.map((week, idx) => (
              <div 
                key={idx} 
                className="grid-cell week-cell" 
                style={{ 
                  gridColumn: `span ${week.span}`,
                  textAlign: 'left'
                }}
              >
                {week.label}
              </div>
            ))}
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
          </div>

          {/* Row 2: Weekday Names */}
          <div className="header-row">
            <div className="grid-cell habit-info-cell header-cell-main">DAILY ROUTINES</div>
            <div className="grid-cell">GOAL</div>
            {displayedDays.map(({ dayNum, dayName, isWeekend }) => (
              <div 
                key={dayNum} 
                className={`grid-cell ${isWeekend ? 'weekend-cell' : ''} ${hoveredDay === dayNum ? 'highlight-column' : ''}`}
                style={{ fontSize: '0.75rem' }}
              >
                {dayName}
              </div>
            ))}
            <div className="grid-cell">DONE</div>
            <div className="grid-cell">% DONE</div>
          </div>

          {/* Row 3: Day Numbers */}
          <div className="header-row">
            <div className="grid-cell habit-info-cell header-cell-main" style={{ borderBottom: '1px solid var(--border-color)' }}>GOALS</div>
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem' }}>Days</div>
            {displayedDays.map(({ dayNum, isWeekend }) => (
              <div 
                key={dayNum} 
                className={`grid-cell ${isWeekend ? 'weekend-cell' : ''} ${hoveredDay === dayNum ? 'highlight-column' : ''}`}
                style={{ borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}
              >
                {dayNum}
              </div>
            ))}
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
            <div className="grid-cell" style={{ borderBottom: '1px solid var(--border-color)' }}></div>
          </div>

          {/* Row 3b: NEW - Toggle All Day Checkboxes */}
          <div className="header-row">
            <div 
              className="grid-cell habit-info-cell header-cell-main" 
              style={{ 
                borderBottom: '2px solid var(--border-color)', 
                background: 'rgba(29, 39, 66, 0.3)',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.5px'
              }}
            >
              TOGGLE ALL DAY
            </div>
            <div className="grid-cell" style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(29, 39, 66, 0.2)' }}></div>
            {displayedDays.map(({ dayNum, isWeekend }) => {
              const allChecked = isDayAllChecked(dayNum);
              const partChecked = isDayPartiallyChecked(dayNum);
              return (
                <div 
                  key={dayNum} 
                  className={`grid-cell ${isWeekend ? 'weekend-cell' : ''} ${hoveredDay === dayNum ? 'highlight-column' : ''}`}
                  style={{ 
                    borderBottom: '2px solid var(--border-color)',
                    background: 'rgba(29, 39, 66, 0.2)',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleToggleSelectAllDay(dayNum)}
                  title={allChecked ? "Uncheck all for this day" : "Check all for this day"}
                >
                  <label className="checkbox-container" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={allChecked}
                      ref={el => {
                        if (el) el.indeterminate = partChecked;
                      }}
                      onChange={() => handleToggleSelectAllDay(dayNum)}
                    />
                    <span 
                      className="checkbox-custom" 
                      style={{ 
                        borderColor: allChecked ? 'var(--neon-green)' : (partChecked ? 'var(--neon-cyan)' : 'var(--border-color-glow)'),
                        backgroundColor: allChecked ? 'rgba(0, 255, 135, 0.2)' : (partChecked ? 'rgba(0, 242, 254, 0.15)' : 'transparent'),
                        borderRadius: '3px',
                        width: '16px',
                        height: '16px'
                      }}
                    >
                      {allChecked && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--neon-green)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px', opacity: 1, transform: 'scale(1)' }}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                      {!allChecked && partChecked && (
                        <div style={{ width: '8px', height: '2px', backgroundColor: 'var(--neon-cyan)', borderRadius: '1px' }}></div>
                      )}
                    </span>
                  </label>
                </div>
              );
            })}
            <div className="grid-cell" style={{ borderBottom: '2px solid var(--border-color)' }}></div>
            <div className="grid-cell" style={{ borderBottom: '2px solid var(--border-color)' }}></div>
          </div>

          {/* Habit Rows */}
          {habits.map((habit) => {
            const { checkedCount, percent } = getHabitCompletionStats(habit.id);
            return (
              <div key={habit.id} className="grid-row-wrap">
                {/* Habit Info (Sticky) */}
                <div 
                  className={`grid-cell habit-info-cell ${hoveredRowId === habit.id ? 'highlight-row' : ''}`}
                  onMouseEnter={() => setHoveredRowId(habit.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <span className="habit-icon">{habit.icon}</span>
                  <span className="habit-name" title={habit.name}>{habit.name}</span>
                </div>

                {/* Habit Target Goal */}
                <div 
                  className={`grid-cell text-mono ${hoveredRowId === habit.id ? 'highlight-row' : ''}`}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                  onMouseEnter={() => setHoveredRowId(habit.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {habit.goal}
                </div>

                {/* Day Checkboxes */}
                {displayedDays.map(({ dayNum, isWeekend }) => {
                  const isChecked = isHabitChecked(habit.id, dayNum);
                  const isCellHovered = hoveredRowId === habit.id && hoveredDay === dayNum;
                  
                  return (
                    <div 
                      key={dayNum} 
                      className={`grid-cell ${isWeekend ? 'weekend-cell' : ''} ${isChecked ? 'checked-cell' : ''} ${
                        hoveredRowId === habit.id ? 'highlight-row' : ''
                      } ${
                        hoveredDay === dayNum ? 'highlight-column' : ''
                      } ${
                        isCellHovered ? 'highlight-cell' : ''
                      }`}
                      onMouseEnter={() => {
                        setHoveredRowId(habit.id);
                        setHoveredDay(dayNum);
                      }}
                      onMouseLeave={() => {
                        setHoveredRowId(null);
                        setHoveredDay(null);
                      }}
                    >
                      <label className="checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => onToggleHabit(habit.id, formatDateKey(year, month, dayNum))}
                        />
                        <span className="checkbox-custom">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </span>
                      </label>
                    </div>
                  );
                })}

                {/* Habit Total Done */}
                <div 
                  className={`grid-cell text-mono ${hoveredRowId === habit.id ? 'highlight-row' : ''}`}
                  style={{ fontWeight: 'bold' }}
                  onMouseEnter={() => setHoveredRowId(habit.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {checkedCount}
                </div>

                {/* Habit % Done */}
                <div 
                  className={`grid-cell text-mono ${hoveredRowId === habit.id ? 'highlight-row' : ''} ${getPctClass(percent)}`}
                  style={{ fontWeight: 'bold' }}
                  onMouseEnter={() => setHoveredRowId(habit.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {percent}%
                </div>
              </div>
            );
          })}

          {/* Row: Done (Daily Column Summary) */}
          <div className="header-row">
            <div className="grid-cell habit-info-cell header-cell-main" style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(19, 25, 44, 0.9)' }}>
              OVERVIEW
            </div>
            <div className="grid-cell" style={{ borderTop: '2px solid var(--border-color)' }}></div>
            {displayedDays.map(({ dayNum, isWeekend }) => {
              const count = getDailyCompletionCount(dayNum);
              return (
                <div 
                  key={dayNum} 
                  className={`grid-cell text-mono ${isWeekend ? 'weekend-cell' : ''} ${hoveredDay === dayNum ? 'highlight-column' : ''}`}
                  style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.85rem' }}
                  onMouseEnter={() => setHoveredDay(dayNum)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {count}
                </div>
              );
            })}
            <div className="grid-cell" style={{ borderTop: '2px solid var(--border-color)' }}></div>
            <div className="grid-cell" style={{ borderTop: '2px solid var(--border-color)' }}></div>
          </div>

          {/* Row: % Done (Daily Column Summary) */}
          <div className="header-row">
            <div className="grid-cell habit-info-cell header-cell-main" style={{ background: 'rgba(19, 25, 44, 0.9)' }}>
              ANALYSIS
            </div>
            <div className="grid-cell"></div>
            {displayedDays.map(({ dayNum, isWeekend }) => {
              const percent = getDailyCompletionPercent(dayNum);
              return (
                <div 
                  key={dayNum} 
                  className={`grid-cell text-mono ${isWeekend ? 'weekend-cell' : ''} ${hoveredDay === dayNum ? 'highlight-column' : ''} ${getPctClass(percent)}`}
                  style={{ fontWeight: 'bold', fontSize: '0.8rem' }}
                  onMouseEnter={() => setHoveredDay(dayNum)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {percent}%
                </div>
              );
            })}
            <div className="grid-cell"></div>
            <div className="grid-cell"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
