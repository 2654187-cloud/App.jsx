'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- הגדרות חיבור ל-SUPABASE והגדרת עיר ---
const SUPABASE_URL = 'https://thnfcunjgodtkcuugbfg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FIo2bDyuizlE6cPf9HzMkw_r621ajwI';
const CITY_NAME = 'Ashdod'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function CalendarApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [dayTimes, setDayTimes] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // מצבי טופס הוספת אירוע
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOwner, setNewOwner] = useState('dudi');
  const [newCategory, setNewCategory] = useState('general_task');
  const [newTime, setNewTime] = useState('');

  // 1. טעינת אירועים מ-Supabase
  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('time', { ascending: true });

    if (error) console.error('שגיאה בטעינת אירועים:', error);
    else setEvents(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 2. משיכת זמני שקיעה מ-Hebcal API לפי העיר
  useEffect(() => {
    const fetchHebcalData = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      try {
        const res = await fetch(
          `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&month=${month}&city=${CITY_NAME}&c=on`
        );
        const data = await res.json();
        const timesByDate = {};
        data.items?.forEach((item) => {
          const itemDate = item.date.split('T')[0];
          if (!timesByDate[itemDate]) timesByDate[itemDate] = {};
          if (item.category === 'sunset') {
            timesByDate[itemDate].sunset = item.title.replace('Sunset: ', '');
          }
        });
        setDayTimes(timesByDate);
      } catch (err) {
        console.error('שגיאה בטעינת זמני היום:', err);
      }
    };

    fetchHebcalData();
  }, [currentDate]);

  // 3. יצירת ימי החודש לגריד
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  };

  // 4. הוספת אירוע חדש ל-Supabase
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedDayData) return;

    const newEvent = {
      title: newTitle,
      date: selectedDayData.dateStr,
      time: newTime || null,
      owner: newOwner,
      category: newCategory,
      is_completed: false,
    };

    const { data, error } = await supabase.from('events').insert([newEvent]).select();

    if (error) {
      alert('שגיאה בשמירת האירוע');
      console.error(error);
    } else if (data) {
      const updatedList = [...events, data[0]];
      setEvents(updatedList);
      setSelectedDayData({
        ...selectedDayData,
        events: updatedList.filter((ev) => ev.date === selectedDayData.dateStr),
      });
      setNewTitle('');
      setNewTime('');
      setShowAddModal(false);
    }
  };

  // 5. מחיקת אירוע
  const handleDeleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      const updatedList = events.filter((e) => e.id !== id);
      setEvents(updatedList);
      setSelectedDayData({
        ...selectedDayData,
        events: updatedList.filter((ev) => ev.date === selectedDayData.dateStr),
      });
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === 'all') return true;
    return ev.owner === activeFilter;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 dir-rtl text-slate-800 font-sans pb-20">
      {/* כותרת ודפדוף חודשים */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-900">היומן המשותף</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-1 bg-white border rounded text-xs"
          >
            ▶
          </button>
          <span className="text-sm font-semibold text-indigo-600">
            {currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-1 bg-white border rounded text-xs"
          >
            ◀
          </button>
        </div>
      </div>

      {/* סרגל סינון יומנים */}
      <div className="flex gap-2 mb-4 text-xs font-medium overflow-x-auto pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full transition ${
            activeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'
          }`}
        >
          הכל
        </button>
        <button
          onClick={() => setActiveFilter('dudi')}
          className={`px-3 py-1.5 rounded-full transition ${
            activeFilter === 'dudi' ? 'bg-blue-600 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          דודי
        </button>
        <button
          onClick={() => setActiveFilter('wife')}
          className={`px-3 py-1.5 rounded-full transition ${
            activeFilter === 'wife' ? 'bg-purple-600 text-white' : 'bg-purple-50 border border-purple-200 text-purple-700'
          }`}
        >
          אשתי
        </button>
        <button
          onClick={() => setActiveFilter('shared')}
          className={`px-3 py-1.5 rounded-full transition ${
            activeFilter === 'shared' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}
        >
          משותף
        </button>
      </div>

      {/* ימי השבוע */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 mb-2">
        <div>א'</div><div>ב'</div><div>ג'</div><div>ד'</div><div>ה'</div><div>ו'</div><div>ש'</div>
      </div>

      {/* גריד חודשי */}
      <div className="grid grid-cols-7 gap-1.5">
        {getDaysInMonth().map((day, idx) => {
          if (!day) return <div key={idx} className="h-20 bg-transparent" />;

          const dayEvents = filteredEvents.filter((e) => e.date === day.dateStr);
          const sunsetTime = dayTimes[day.dateStr]?.sunset;

          return (
            <div
              key={day.dateStr}
              onClick={() => setSelectedDayData({ ...day, events: dayEvents, times: dayTimes[day.dateStr] })}
              className="h-20 bg-white rounded-lg border border-slate-200 p-1 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition shadow-sm"
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-700 text-xs">{day.dayNumber}</span>
                {sunsetTime && <span className="text-amber-600 font-mono">🌅{sunsetTime}</span>}
              </div>

              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[9px] truncate px-1 rounded ${
                      ev.owner === 'dudi'
                        ? 'bg-blue-100 text-blue-800'
                        : ev.owner === 'wife'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[8px] text-slate-400 font-bold">+ עוד {dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* חלונית תצוגה יומית */}
      {selectedDayData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-40">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  תצוגה יומית – {selectedDayData.dateStr}
                </h2>
                {selectedDayData.times?.sunset && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    שקיעה בעיר שלך: <strong>{selectedDayData.times.sunset}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedDayData(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">לו"ז ומשימות</h3>
              {selectedDayData.events.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">אין פגישות או משימות ליום זה.</p>
              ) : (
                selectedDayData.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          ev.owner === 'dudi'
                            ? 'bg-blue-600'
                            : ev.owner === 'wife'
                            ? 'bg-purple-600'
                            : 'bg-emerald-600'
                        }`}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{ev.title}</div>
                        <div className="text-xs text-slate-400">{ev.time || 'ללא שעה'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-500">
                        {ev.category === 'supplier'
                          ? 'ספק'
                          : ev.category === 'appointment'
                          ? 'תור'
                          : 'משימה'}
                      </span>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-red-400 text-xs hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-200"
            >
              + הוספת אירוע / משימה ליום זה
            </button>
          </div>
        </div>
      )}

      {/* טופס הוספת אירוע חדש */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">אירוע חדש ל-{selectedDayData?.dateStr}</h3>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">כותרת המשימה / פגישה</label>
                <input
                  type="text"
                  required
                  placeholder="למשל: תור לרופא שיניים"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">שיוך יומן</label>
                <select
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-sm bg-white"
                >
                  <option value="dudi">דודי (אישי)</option>
                  <option value="wife">אשתי (אישי)</option>
                  <option value="shared">משותף לשנינו</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">קטגוריה</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm bg-white"
                  >
                    <option value="general_task">משימה</option>
                    <option value="appointment">תור / פגישה</option>
                    <option value="supplier">ספקים</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">שעה (אופציונלי)</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border text-slate-600 rounded-xl text-sm"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
