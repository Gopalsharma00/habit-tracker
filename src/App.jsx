import React, { useState, useEffect, useRef } from 'react';
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
  // 1. Core States
  const [habits, setHabitsState] = useState(() => {
    const saved = localStorage.getItem('art_consistency_habits_v2');
    return saved ? JSON.parse(saved) : DEFAULT_HABITS;
  });

  const [logs, setLogsState] = useState(() => {
    const saved = localStorage.getItem('art_consistency_logs_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 2. Real-Time Cloud Sync State
  const [syncKey, setSyncKey] = useState(() => {
    return localStorage.getItem('art_consistency_sync_key') || '';
  });

  const [localLastUpdated, setLocalLastUpdated] = useState(() => {
    return parseInt(localStorage.getItem('art_consistency_last_updated')) || 0;
  });

  const [syncStatusState, setSyncStatusState] = useState('idle'); // 'idle' | 'loading' | 'synced' | 'error'
  const [syncMessageState, setSyncMessageState] = useState('');

  // Refs to avoid state capture inside intervals
  const localLastUpdatedRef = useRef(localLastUpdated);
  const isSyncingRef = useRef(false);

  // Sync state helpers
  const markLocalUpdate = () => {
    const now = Date.now();
    setLocalLastUpdated(now);
    localLastUpdatedRef.current = now;
    localStorage.setItem('art_consistency_last_updated', now.toString());
  };

  // Wrapper setHabits that logs local change
  const setHabits = (newHabits) => {
    setHabitsState(newHabits);
    markLocalUpdate();
  };

  // Wrapper setLogs that logs local change
  const setLogs = (newLogs) => {
    setLogsState(newLogs);
    markLocalUpdate();
  };

  // Sync state persistence to LocalStorage
  useEffect(() => {
    localStorage.setItem('art_consistency_habits_v2', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('art_consistency_logs_v2', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('art_consistency_sync_key', syncKey);
  }, [syncKey]);

  // 3. Toggle Checked Box Callback
  const handleToggleHabit = (habitId, dateKey) => {
    setLogsState(prevLogs => {
      const dayLogs = prevLogs[dateKey] ? [...prevLogs[dateKey]] : [];
      let updatedLogs;
      if (dayLogs.includes(habitId)) {
        const updated = dayLogs.filter(id => id !== habitId);
        if (updated.length === 0) {
          const { [dateKey]: _, ...rest } = prevLogs;
          updatedLogs = rest;
        } else {
          updatedLogs = { ...prevLogs, [dateKey]: updated };
        }
      } else {
        updatedLogs = { ...prevLogs, [dateKey]: [...dayLogs, habitId] };
      }
      return updatedLogs;
    });
    markLocalUpdate();
  };

  // 3b. Toggle All Habits for a Day Callback
  const handleToggleAllDay = (dateKey, checkAll) => {
    setLogsState(prevLogs => {
      let updatedLogs;
      if (checkAll) {
        const allHabitIds = habits.map(h => h.id);
        updatedLogs = { ...prevLogs, [dateKey]: allHabitIds };
      } else {
        const dayLogs = prevLogs[dateKey] ? [...prevLogs[dateKey]] : [];
        const updated = dayLogs.filter(id => !habits.some(h => h.id === id));
        if (updated.length === 0) {
          const { [dateKey]: _, ...rest } = prevLogs;
          updatedLogs = rest;
        } else {
          updatedLogs = { ...prevLogs, [dateKey]: updated };
        }
      }
      return updatedLogs;
    });
    markLocalUpdate();
  };

  // 4. Cloud Sync Upload/Download Logic

  // Upload state to Neon cloud Postgres
  const uploadCloudData = async (timestamp, currentHabits, currentLogs) => {
    if (!syncKey.trim()) return;
    setSyncStatusState('loading');
    setSyncMessageState('Syncing changes...');

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: syncKey.trim(), 
          habits: currentHabits, 
          logs: currentLogs, 
          lastUpdated: timestamp 
        })
      });

      if (!response.ok) {
        throw new Error('Sync upload failed.');
      }

      setSyncStatusState('synced');
      setSyncMessageState('Database synced');
    } catch (err) {
      console.warn("Auto-upload failed:", err);
      setSyncStatusState('error');
      setSyncMessageState('Sync failed (offline)');
    }
  };

  // Download/Check logic (called periodically)
  const checkCloudSync = async () => {
    if (!syncKey.trim()) return;

    try {
      const response = await fetch(`/api/sync?key=${encodeURIComponent(syncKey.trim())}`);
      
      // If 404, database does not have records for this key yet, so upload ours to initialize it!
      if (response.status === 404) {
        console.log("No cloud records found. Initializing database with local data...");
        uploadCloudData(localLastUpdatedRef.current, habits, logs);
        return;
      }

      if (!response.ok) {
        throw new Error('Sync fetch failed');
      }

      const cloudData = await response.json();
      const serverLastUpdated = cloudData.lastUpdated || 0;

      // 1. Cloud has newer changes -> overwrite local state
      if (serverLastUpdated > localLastUpdatedRef.current) {
        console.log("Cloud data is newer. Syncing down...");
        setSyncStatusState('loading');
        setSyncMessageState('Updating data...');
        
        isSyncingRef.current = true;
        
        setHabitsState(cloudData.habits || []);
        setLogsState(cloudData.logs || {});
        setLocalLastUpdated(serverLastUpdated);
        localLastUpdatedRef.current = serverLastUpdated;
        localStorage.setItem('art_consistency_last_updated', serverLastUpdated.toString());
        
        setSyncStatusState('synced');
        setSyncMessageState('Updated from cloud');
      } 
      // 2. Local has newer changes -> upload them
      else if (localLastUpdatedRef.current > serverLastUpdated) {
        console.log("Local data is newer. Syncing up...");
        uploadCloudData(localLastUpdatedRef.current, habits, logs);
      } 
      // 3. Already synchronized
      else {
        setSyncStatusState('synced');
        setSyncMessageState('Database synced');
      }
    } catch (err) {
      console.warn("Background sync check failed:", err);
      // Don't show disruptive error messages for background network failures
    }
  };

  // Debounced Auto-Upload on Local Changes
  useEffect(() => {
    if (!syncKey.trim() || localLastUpdated === 0) return;
    
    // If the state change was triggered by downloading from server, skip uploading
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      uploadCloudData(localLastUpdated, habits, logs);
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [localLastUpdated, syncKey]);

  // Periodic Polling Interval (True Real-Time Sync)
  useEffect(() => {
    if (!syncKey.trim()) {
      setSyncStatusState('idle');
      setSyncMessageState('');
      return;
    }

    // Run first check immediately
    checkCloudSync();

    // Poll the database every 3 seconds for near real-time updates
    const interval = setInterval(() => {
      // Only check if tab is active to preserve resources
      if (document.visibilityState === 'visible') {
        checkCloudSync();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [syncKey]);

  // Handle manual force sync trigger
  const handleForceSync = async () => {
    setSyncStatusState('loading');
    setSyncMessageState('Checking cloud connection...');
    await checkCloudSync();
  };

  // 5. Calculate Stats for Header Cards
  const daysInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate();
  
  let totalChecked = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(currentDate.year, currentDate.month, d);
    if (logs[key]) {
      const validLogs = logs[key].filter(id => habits.some(h => h.id === id));
      totalChecked += validLogs.length;
    }
  }

  const totalPossible = habits.length * daysInMonth;
  const completionRate = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

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
      checkDate = new Date(currentDate.year, currentDate.month + 1, 0);
    } else {
      checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    while (true) {
      const key = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      
      if (logs[key] && logs[key].some(id => habits.some(h => h.id === id))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
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
        syncKey={syncKey}
        setSyncKey={setSyncKey}
        syncStatus={syncStatusState}
        syncMessage={syncMessageState}
        onForceSync={handleForceSync}
      />
    </div>
  );
}
