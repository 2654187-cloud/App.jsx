const { useState, useEffect } = React;

// --- הגדרות חיבור ל-SUPABASE מתוך ההגדרות שלך ---
const SUPABASE_URL = 'https://thnfcunjgodtkcuugbfg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FIo2bDyuizlE6cPf9HzMkw_r621ajwI';
const CITY_NAME = 'Ashdod';

// יצירת לקוח Supabase דרך הספרייה הנסמכת
const supabase = (window.supabase && window.supabase.createClient) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// ==========================================
// פונקציות עזר לתאריכים עבריים (Hebcal CDN)
// ==========================================

function getHebrewInfo(dateObj) {
  if (!window.hebcal) return { dayStr: '', monthName: '', yearStr: '', fullStr: '' };
  const { HDate, gematriya } = window.hebcal;
  const hdate = new HDate(dateObj);
  const monthNum = hdate.getMonth();
  const isLeap = hdate.isLeapYear();

  const monthNames = {
    1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
    7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר',
    13: 'אדר ב\'', 14: 'אדר א\''
  };

  let monthName = monthNames[monthNum] || hdate.getMonthName();
  if (isLeap && monthNum === 12) monthName = 'אדר א\'';
  if (isLeap && monthNum === 13) monthName = 'אדר ב\'';

  const dayStr = gematriya(hdate.getDate());
  const yearStr = gematriya(hdate.getFullYear());

  return {
    hdateObj: hdate,
    dayNum: hdate.getDate(),
    dayStr,
    monthNum,
    monthName,
    yearNum: hdate.getFullYear(),
    yearStr,
    isLeap,
    fullStr: `${dayStr} ב${monthName} ${yearStr}`
  };
}

function getHebrewMonthsForYear(hYear) {
  if (!window.hebcal) return [];
  const { HDate } = window.hebcal;
  const sample = new HDate(1, 1, hYear);
  const isLeap = sample.isLeapYear();

  if (isLeap) {
    return [
      { id: 7, name: 'תשרי' }, { id: 8, name: 'חשוון' }, { id: 9, name: 'כסלו' },
      { id: 10, name: 'טבת' }, { id: 11, name: 'שבט' }, { id: 14, name: 'אדר א\'' },
      { id: 13, name: 'אדר ב\'' }, { id: 1, name: 'ניסן' }, { id: 2, name: 'אייר' },
      { id: 3, name: 'סיון' }, { id: 4, name: 'תמוז' }, { id: 5, name: 'אב' }, { id: 6, name: 'אלול' }
    ];
  }

  return [
    { id: 7, name: 'תשרי' }, { id: 8, name: 'חשוון' }, { id: 9, name: 'כסלו' },
    { id: 10, name: 'טבת' }, { id: 11, name: 'שבט' }, { id: 12, name: 'אדר' },
    { id: 1, name: 'ניסן' }, { id: 2, name: 'אייר' }, { id: 3, name: 'סיון' },
    { id: 4, name: 'תמוז' }, { id: 5, name: 'אב' }, { id: 6, name: 'אלול' }
  ];
}

function getHebrewMonthGrid(hYear, hMonth) {
  if (!window.hebcal) return [];
  const { HDate, gematriya } = window.hebcal;
  const firstDay = new HDate(1, hMonth, hYear);
  const totalDays = firstDay.daysInMonth();
  const grid = [];

  for (let d = 1; d <= totalDays; d++) {
    const hd = new HDate(d, hMonth, hYear);
    const greg = hd.greg();
    const isoDate = greg.toISOString().split('T')[0];
    grid.push({
      hDayNum: d,
      hDayStr: gematriya(d),
      gregDate: greg,
      isoDate,
      dayOfWeek: greg.getDay()
    });
  }
  return grid;
}

// ==========================================
// רכיב האפליקציה הראשי
// ==========================================

function CalendarApp() {
  const [calendarMode, setCalendarMode] = useState('hebrew'); // 'hebrew' או 'gregorian'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentGregDate, setCurrentGregDate] = useState(new Date());

  const initHInfo = getHebrewInfo(new Date());
  const [selectedHYear, setSelectedHYear] = useState(initHInfo.yearNum || 5786);
  const [selectedHMonth, setSelectedHMonth] = useState(initHInfo.monthNum || 6);

  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    owner: 'משותף',
    time: '10:00'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*');
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!newEvent.title) return;

    if (supabase) {
      const { data, error } = await supabase.from('events').insert([
        {
          title: newEvent.title,
          date: newEvent.date,
          owner: newEvent.owner,
          time: newEvent.time
        }
      ]);

      if (error) {
        alert("שגיאה בשמירת האירוע: " + error.message);
        return;
      }
    } else {
      setEvents([...events, { ...newEvent, id: Date.now() }]);
    }

    setShowModal(false);
    setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], owner: 'משותף', time: '10:00' });
    fetchEvents();
  }

  const getOwnerBadge = (owner) => {
    switch (owner) {
      case 'דודי': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'שיינדי': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'כללי': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const hebrewMonths = getHebrewMonthsForYear(selectedHYear);
  const hebrewGridDays = getHebrewMonthGrid(selectedHYear, selectedHMonth);

  const prevHebrewMonth = () => {
    const currentIndex = hebrewMonths.findIndex(m => m.id === selectedHMonth);
    if (currentIndex > 0) {
      setSelectedHMonth(hebrewMonths[currentIndex - 1].id);
    } else {
      setSelectedHYear(selectedHYear - 1);
      const prevYearMonths = getHebrewMonthsForYear(selectedHYear - 1);
      setSelectedHMonth(prevYearMonths[prevYearMonths.length - 1].id);
    }
  };

  const nextHebrewMonth = () => {
    const currentIndex = hebrewMonths.findIndex(m => m.id === selectedHMonth);
    if (currentIndex < hebrewMonths.length - 1) {
      setSelectedHMonth(hebrewMonths[currentIndex + 1].id);
    } else {
      setSelectedHYear(selectedHYear + 1);
      const nextYearMonths = getHebrewMonthsForYear(selectedHYear + 1);
      setSelectedHMonth(nextYearMonths[0].id);
    }
  };

  const prevGregMonth = () => {
    setCurrentGregDate(new Date(currentGregDate.getFullYear(), currentGregDate.getMonth() - 1, 1));
  };
  const nextGregMonth = () => {
    setCurrentGregDate(new Date(currentGregDate.getFullYear(), currentGregDate.getMonth() + 1, 1));
  };

  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 md:p-6 font-sans dir-rtl">
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
            יומן ניהול לו"ז משפחתי
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {getHebrewInfo(new Date()).fullStr} | {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setCalendarMode('hebrew')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              calendarMode === 'hebrew'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 לוח עברי
          </button>
          <button
            onClick={() => setCalendarMode('gregorian')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              calendarMode === 'gregorian'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 לוח לועזי
          </button>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>אירוע חדש</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto bg-slate-800/50 rounded-2xl border border-slate-700/80 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex justify-between items-center mb-6 px-2">
          <button
            onClick={calendarMode === 'hebrew' ? prevHebrewMonth : prevGregMonth}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors text-lg"
          >
            ➔
          </button>

          {calendarMode === 'hebrew' ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedHMonth}
                onChange={(e) => setSelectedHMonth(Number(e.target.value))}
                className="bg-slate-900 text-emerald-400 border border-slate-700 font-bold text-lg md:text-xl rounded-xl p-2 outline-none"
              >
                {hebrewMonths.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <span className="text-xl md:text-2xl font-black text-slate-200">
                {window.hebcal ? window.hebcal.gematriya(selectedHYear) : selectedHYear}
              </span>
            </div>
          ) : (
            <h2 className="text-xl md:text-2xl font-black text-indigo-300">
              {currentGregDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
            </h2>
          )}

          <button
            onClick={calendarMode === 'hebrew' ? nextHebrewMonth : nextGregMonth}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors text-lg"
          >
            ⬅
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center font-bold text-slate-400 text-xs md:text-sm">
          {daysOfWeek.map((day, i) => (
            <div key={i} className="py-2 bg-slate-800/80 rounded-lg">{day}</div>
          ))}
        </div>

        {calendarMode === 'hebrew' && (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {Array.from({ length: hebrewGridDays[0]?.dayOfWeek || 0 }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-24 md:h-32 bg-slate-900/30 rounded-xl border border-slate-800/50 opacity-30"></div>
            ))}

            {hebrewGridDays.map((day) => {
              const dayEvents = events.filter(e => e.date === day.isoDate);
              const isToday = day.isoDate === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={day.isoDate}
                  className={`h-24 md:h-32 p-1.5 md:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-base md:text-lg text-emerald-400">{day.hDayStr}</span>
                    <span className="text-[10px] md:text-xs text-slate-500">{day.gregDate.getDate()}/{day.gregDate.getMonth() + 1}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto my-1 flex flex-col gap-1">
                    {dayEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className={`text-[10px] md:text-xs p-1 rounded-md border font-semibold truncate ${getOwnerBadge(evt.owner)}`}
                        title={`${evt.title} (${evt.owner})`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {calendarMode === 'gregorian' && (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {(() => {
              const year = currentGregDate.getFullYear();
              const month = currentGregDate.getMonth();
              const firstDayIndex = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const grid = [];

              for (let i = 0; i < firstDayIndex; i++) {
                grid.push(<div key={`g-empty-${i}`} className="h-24 md:h-32 bg-slate-900/30 rounded-xl border border-slate-800/50 opacity-30"></div>);
              }

              for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month, d);
                const isoDate = dateObj.toISOString().split('T')[0];
                const hInfo = getHebrewInfo(dateObj);
                const dayEvents = events.filter(e => e.date === isoDate);
                const isToday = isoDate === new Date().toISOString().split('T')[0];

                grid.push(
                  <div
                    key={isoDate}
                    className={`h-24 md:h-32 p-1.5 md:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                      isToday
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-base md:text-lg text-indigo-300">{d}</span>
                      <span className="text-[10px] md:text-xs text-emerald-400 font-bold">{hInfo.dayStr} {hInfo.monthName}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto my-1 flex flex-col gap-1">
                      {dayEvents.map((evt, idx) => (
                        <div
                          key={idx}
                          className={`text-[10px] md:text-xs p-1 rounded-md border font-semibold truncate ${getOwnerBadge(evt.owner)}`}
                        >
                          {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return grid;
            })()}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">הוספת אירוע חדש</h3>
            <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">שם האירוע</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                  placeholder="לדוגמה: פגישה משפחתית"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">תאריך</label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">שיוך אירוע (בעלים)</label>
                <select
                  value={newEvent.owner}
                  onChange={(e) => setNewEvent({ ...newEvent, owner: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="משותף">משותף 🤝</option>
                  <option value="דודי">דודי 👨</option>
                  <option value="שיינדי">שיינדי 👩</option>
                  <option value="כללי">כללי 📌</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 text-sm font-bold"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-sm font-bold"
                >
                  שמור אירוע
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<CalendarApp />, document.getElementById('root'));
