import React, { useState } from 'react';
import { X, Plus, Trash2, Download, Upload, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function HabitSettings({ 
  isOpen, 
  onClose, 
  habits, 
  setHabits, 
  logs, 
  setLogs,
  syncKey,
  setSyncKey,
  syncStatus,
  syncMessage,
  onForceSync
}) {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🎯');
  const [newHabitGoal, setNewHabitGoal] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Add a new habit
  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) {
      setErrorMsg('Habit name cannot be empty');
      return;
    }
    setErrorMsg('');

    const newHabit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      icon: newHabitIcon.trim() || '🎯',
      goal: parseInt(newHabitGoal) || 30
    };

    setHabits([...habits, newHabit]);
    setNewHabitName('');
    setNewHabitIcon('🎯');
    setNewHabitGoal(30);
  };

  // Delete a habit
  const handleDeleteHabit = (id) => {
    if (window.confirm('Are you sure you want to delete this habit? All progress logs for this habit will remain stored, but it will be removed from your dashboard.')) {
      setHabits(habits.filter(h => h.id !== id));
    }
  };

  // Export all data to JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ habits, logs }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `consistency_tracker_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import data from JSON
  const handleImportData = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        
        if (!parsedData.habits || !parsedData.logs) {
          setErrorMsg('Invalid backup file. Must contain habits and logs.');
          return;
        }

        if (window.confirm('Importing will overwrite your current habits and logs. Are you sure you want to proceed?')) {
          setHabits(parsedData.habits);
          setLogs(parsedData.logs);
          setErrorMsg('');
          alert('Data imported successfully!');
        }
      } catch (err) {
        setErrorMsg('Failed to parse JSON file.');
      }
    };

    fileReader.readAsText(file);
  };

  // Status-based color helper
  const getStatusColor = () => {
    if (syncStatus === 'synced') return 'var(--neon-green)';
    if (syncStatus === 'loading') return 'var(--neon-cyan)';
    if (syncStatus === 'error') return 'var(--neon-pink)';
    return 'var(--text-muted)';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Habit Settings & Backups
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {errorMsg && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--neon-pink)', 
              background: 'rgba(255, 0, 127, 0.1)', 
              padding: '0.75rem', 
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Add Habit Form */}
          <form onSubmit={handleAddHabit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Add New Habit
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Habit Name</label>
                <input 
                  type="text" 
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. Study" 
                  className="input-custom"
                />
              </div>

              <div className="form-group" style={{ width: '80px' }}>
                <label className="form-label">Emoji</label>
                <input 
                  type="text" 
                  value={newHabitIcon}
                  onChange={(e) => setNewHabitIcon(e.target.value)}
                  maxLength={4}
                  placeholder="📚" 
                  className="input-custom"
                  style={{ textAlign: 'center' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label className="form-label">Monthly Target Goal (Days)</label>
                <input 
                  type="number" 
                  value={newHabitGoal}
                  onChange={(e) => setNewHabitGoal(e.target.value)}
                  min={1}
                  max={31}
                  className="input-custom"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', height: '42px' }}>
                <Plus size={16} /> Add Habit
              </button>
            </div>
          </form>

          {/* Manage Habits List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Manage Current Habits ({habits.length})
            </h3>
            
            <div className="edit-habit-list" style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {habits.map((habit) => (
                <div key={habit.id} className="edit-habit-item">
                  <span style={{ fontSize: '1.2rem' }}>{habit.icon}</span>
                  <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{habit.name}</span>
                  <span className="habit-target-tag">Goal: {habit.goal}d</span>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    onClick={() => handleDeleteHabit(habit.id)}
                    style={{ border: 'none', background: 'transparent', marginLeft: 'auto', color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-pink)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {habits.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No habits added yet.
                </div>
              )}
            </div>
          </div>

          {/* Real-time Cloud Sync Section */}
          <div className="backup-section" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Database size={16} style={{ color: 'var(--neon-cyan)' }} />
              Cloud Database Sync (Neon Postgres)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time sync keeps phone and laptop in perfect step automatically. Enter a shared unique key (like a password) on both devices.
            </p>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cloud Sync Key</span>
                {syncKey && (
                  <span style={{ 
                    color: getStatusColor(), 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: getStatusColor(),
                      boxShadow: `0 0 6px ${getStatusColor()}`
                    }}></span>
                    {syncMessage || 'Connected'}
                  </span>
                )}
              </label>
              <input 
                type="password" 
                value={syncKey}
                onChange={(e) => setSyncKey(e.target.value)}
                placeholder="e.g. my-secret-sync-code" 
                className="input-custom"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            {syncKey && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onForceSync}
                disabled={syncStatus === 'loading'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
              >
                <RefreshCw size={14} className={syncStatus === 'loading' ? 'glow-pulse' : ''} />
                Sync Now (Force Update Check)
              </button>
            )}
          </div>

          {/* Backup Section */}
          <div className="backup-section">
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Local Backup File
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Offline backups in case you want to keep copies as JSON files.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleExportData}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Export JSON
              </button>
              
              <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', textAlign: 'center' }}>
                <Upload size={16} /> Import JSON
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportData} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
