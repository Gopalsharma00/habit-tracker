import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HabitGrid from './components/HabitGrid';
import Analytics from './components/Analytics';
import HabitSettings from './components/HabitSettings';

const DEFAULT_HABITS = [
  { id: '5', name: 'Reading/Meditating', icon: '🧘', goal: 30 },
  { id: '6', name: 'Time with God', icon: '🙏', goal: 30 },
  { id: '7', name: 'Deep Work', icon: '💻', goal: 30 },
  { id: '8', name: 'Cold Shower', icon: '❄️', goal: 30 },
  { id: '9', name: 'Gym', icon: '🏋️', goal: 30 },
  { id: '10', name: 'Wake up early', icon: '🌅', goal: 30 },
  { id: '11', name: 'Water', icon: '💧', goal: 30 },
  { id: '12', name: 'Workout', icon: '💪', goal: 30 },
  { id: '13', name: 'Study', icon: '📚', goal: 30 },
  { id: '14', name: 'Apply jobs', icon: '💼', goal: 30 },
  { id: '15', name: 'Communication', icon: '🗣️', goal: 30 }
];

const formatDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

export default function App() {
  // 1. Core States (Version 2 storage keys to refresh default habits list)
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('art_consistency_habits_v2');
    return saved ? JSON.parse(saved) : DEFAULT_HABITS;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('art_consistency_logs_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 2. LocalStorage Persistence Sync
  useEffect(() => {
    localStorage.setItem('art_consistency_habits_v2', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('art_consistency_logs_v2', JSON.stringify(logs));
  }, [logs]);

  // 3. Toggle Checked Box Callback
  const handleToggleHabit = (habitId, dateKey) => {
    setLogs(prevLogs => {
      const dayLogs = prevLogs[dateKey] ? [...prevLogs[dateKey]] : [];
      if (dayLogs.includes(habitId)) {
        // Remove habit
        const updated = dayLogs.filter(id => id !== habitId);
        if (updated.length === 0) {
          const { [dateKey]: _, ...rest } = prevLogs;
          return rest;
        }
        return { ...prevLogs, [dateKey]: updated };
      } else {
        // Add habit
        return { ...prevLogs, [dateKey]: [...dayLogs, habitId] };
      }
    });
  };

  // 3b. Toggle All Habits for a Day Callback
  const handleToggleAllDay = (dateKey, checkAll) => {
    setLogs(prevLogs => {
      if (checkAll) {
        // Check all habits for this date
        const allHabitIds = habits.map(h => h.id);
        return { ...prevLogs, [dateKey]: allHabitIds };
      } else {
        // Uncheck all habits for this date
        const dayLogs = prevLogs[dateKey] ? [...prevLogs[dateKey]] : [];
        const updated = dayLogs.filter(id => !habits.some(h => h.id === id));
        if (updated.length === 0) {
          const { [dateKey]: _, ...rest } = prevLogs;
          return rest;
        }
        return { ...prevLogs, [dateKey]: updated };
      }
    });
  };

  // 4. Calculate Stats for Header Cards
  const daysInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate();
  
  // Total checked slots in current month
  let totalChecked = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(currentDate.year, currentDate.month, d);
    if (logs[key]) {
      // Filter logs to only count active/existing habits
      const validLogs = logs[key].filter(id => habits.some(h => h.id === id));
      totalChecked += validLogs.length;
    }
  }

  const totalPossible = habits.length * daysInMonth;
  const completionRate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  // Streak Calculation
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    let checkDate = new Date();
    
    const isPastMonth = currentDate.year < today.getFullYear() || 
      (currentDate.year === today.getFullYear() && currentDate.month < today.getMonth());
    const isFutureMonth = currentDate.year > today.getFullYear() || 
      (currentDate.year === today.getFullYear() && currentDate.month > today.getMonth());
    
    if (isFutureMonth) return 0;
    
    if (isPastMonth) {
      // Start from the last day of the selected month
      checkDate = new Date(currentDate.year, currentDate.month + 1, 0);
    } else {
      // Start from today
      checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    while (true) {
      const key = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      
      // If we have valid completed habits for this date
      if (logs[key] && logs[key].some(id => habits.some(h => h.id === id))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If checkDate is today, check if yesterday was active.
        // That keeps the streak alive if they haven't finished checking today.
        const isToday = checkDate.toDateString() === today.toDateString();
        if (isToday) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = formatDateKey(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          
          if (logs[yKey] && logs[yKey].some(id => habits.some(h => h.id === id))) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  // Best Habit Calculation
  const calculateBestHabit = () => {
    if (habits.length === 0) return null;
    
    let best = null;
    let maxRate = -1;

    habits.forEach(h => {
      let checks = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const key = formatDateKey(currentDate.year, currentDate.month, d);
        if (logs[key] && logs[key].includes(h.id)) {
          checks++;
        }
      }
      const rate = daysInMonth > 0 ? Math.round((checks / daysInMonth) * 100) : 0;
      if (rate > maxRate) {
        maxRate = rate;
        best = { ...h, rate };
      }
    });

    return maxRate > 0 ? best : null;
  };

  const stats = {
    completionRate,
    totalChecked,
    totalPossible,
    currentStreak: calculateStreak(),
    bestHabit: calculateBestHabit(),
    activeHabitsCount: habits.length
  };

  return (
    <div className="dashboard">
      <Header 
        currentDate={currentDate} 
        setCurrentDate={setCurrentDate} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
      />
      
      <HabitGrid 
        currentDate={currentDate} 
        habits={habits}
        logs={logs}
        onToggleHabit={handleToggleHabit}
        onToggleAllDay={handleToggleAllDay}
      />

      <Analytics 
        currentDate={currentDate}
        habits={habits}
        logs={logs}
      />

      <HabitSettings 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        habits={habits}
        setHabits={setHabits}
        logs={logs}
        setLogs={setLogs}
      />
    </div>
  );
}
