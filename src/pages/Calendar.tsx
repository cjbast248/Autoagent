import * as React from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Plus,
  Search,
  Filter,
  Settings2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  getDay,
  getHours,
  getMinutes,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { useCallbacks, useCallbackOperations } from '@/hooks/useCallbacks';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { CalendarEventDetailsModal } from '@/components/CalendarEventDetailsModal';

const HOUR_HEIGHT = 80;
const HOURS_START = 9;
const HOURS_END = 18;
const TOTAL_HOURS = HOURS_END - HOURS_START;

interface CalendarEvent {
  id: string;
  client_name?: string;
  status: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  phone_number?: string;
  duration_minutes?: number;
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const { data: callbacks = [], isLoading } = useCallbacks();
  const { deleteCallback } = useCallbackOperations();

  const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'Week' | 'Month'>('Week');
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [selectedMiniCalendarDay, setSelectedMiniCalendarDay] = React.useState(new Date());
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Infinite scroll state
  const [slideDirection, setSlideDirection] = React.useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const touchStartX = React.useRef<number>(0);
  const touchEndX = React.useRef<number>(0);
  const horizontalScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Generate week days (Monday to Friday)
  const weekDays = React.useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Generate hours array
  const hours = React.useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => HOURS_START + i);
  }, []);

  // Generate mini calendar days
  const miniCalendarDays = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding for first week
    const firstDayOfWeek = getDay(start);
    const paddingStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const prevMonthDays = Array.from({ length: paddingStart }, (_, i) =>
      addDays(start, -(paddingStart - i))
    );

    return [...prevMonthDays, ...days];
  }, [currentMonth]);

  // Get current time position
  const getCurrentTimePosition = React.useCallback(() => {
    const now = new Date();
    const currentHour = getHours(now);
    const currentMinute = getMinutes(now);

    if (currentHour < HOURS_START || currentHour >= HOURS_END) return null;

    const minuteOffset = (currentHour - HOURS_START) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT;
    return minuteOffset;
  }, []);

  const [currentTimePos, setCurrentTimePos] = React.useState(getCurrentTimePosition());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 60000);
    return () => clearInterval(interval);
  }, [getCurrentTimePosition]);

  React.useEffect(() => {
    if (scrollContainerRef.current && currentTimePos) {
      scrollContainerRef.current.scrollTop = Math.max(0, currentTimePos - 100);
    }
  }, []);

  // Navigation with animation
  const goToPrevWeek = React.useCallback(() => {
    if (isAnimating) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentWeekStart(prev => subWeeks(prev, 1));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating]);

  const goToNextWeek = React.useCallback(() => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentWeekStart(prev => addWeeks(prev, 1));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating]);

  const goToPrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setCurrentMonth(today);
    setSelectedMiniCalendarDay(today);
  };

  // Touch/Swipe handlers for infinite horizontal scroll
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped left - go to next week
        goToNextWeek();
      } else {
        // Swiped right - go to previous week
        goToPrevWeek();
      }
    }
  };

  // Mouse wheel horizontal scroll
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    // Only trigger on horizontal scroll or shift+scroll
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      const threshold = 50;
      if (e.deltaX > threshold || (e.shiftKey && e.deltaY > threshold)) {
        goToNextWeek();
      } else if (e.deltaX < -threshold || (e.shiftKey && e.deltaY < -threshold)) {
        goToPrevWeek();
      }
    }
  }, [goToNextWeek, goToPrevWeek]);

  // Calculate event position
  const getEventStyle = (event: CalendarEvent) => {
    const eventDate = new Date(event.scheduled_time || event.scheduled_datetime || new Date());
    const hour = getHours(eventDate);
    const minutes = getMinutes(eventDate);
    const duration = event.duration_minutes || 60;

    if (hour < HOURS_START || hour >= HOURS_END) return null;

    const top = (hour - HOURS_START) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    const height = Math.max(40, (duration / 60) * HOUR_HEIGHT);

    return { top, height };
  };

  // Filter callbacks by search query
  const filteredCallbacks = React.useMemo(() => {
    if (!searchQuery.trim()) return callbacks;
    const query = searchQuery.toLowerCase();
    return callbacks.filter(event =>
      event.client_name?.toLowerCase().includes(query) ||
      event.phone_number?.toLowerCase().includes(query)
    );
  }, [callbacks, searchQuery]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return filteredCallbacks.filter(event => {
      const eventDate = new Date(event.scheduled_time || event.scheduled_datetime || new Date());
      return isSameDay(eventDate, day);
    });
  };

  // Get all events for current month (for Month view)
  const getEventsForMonth = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return filteredCallbacks.filter(event => {
      const eventDate = new Date(event.scheduled_time || event.scheduled_datetime || new Date());
      return eventDate >= start && eventDate <= end;
    });
  }, [filteredCallbacks, currentMonth]);

  // Handle mini calendar day click
  const handleMiniCalendarDayClick = (day: Date) => {
    setSelectedMiniCalendarDay(day);
    setCurrentWeekStart(startOfWeek(day, { weekStartsOn: 1 }));
  };

  // Handle delete event
  const handleDeleteEvent = (event: CalendarEvent) => {
    if (window.confirm('Ești sigur că vrei să ștergi această programare?')) {
      deleteCallback.mutate(event.id);
    }
  };

  if (!user) return <Navigate to="/auth" replace />;

  const todayColumnIndex = weekDays.findIndex(day => isToday(day));

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Left Sidebar */}
        <aside className="w-72 flex-col pt-8 pl-8 pr-4 hidden md:flex">
          {/* Month Title with Navigation */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-black">
                  {format(currentMonth, 'MMMM')}
                </h1>
                <p className="text-sm text-zinc-400 font-medium">
                  {format(currentMonth, 'yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevMonth}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mini Calendar */}
          <div className="mb-10">
            <div className="grid grid-cols-7 text-center text-[10px] text-zinc-400 font-bold mb-4">
              <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-medium gap-y-4">
              {miniCalendarDays.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedMiniCalendarDay);
                const isTodayDay = isToday(day);

                return (
                  <div
                    key={index}
                    onClick={() => handleMiniCalendarDayClick(day)}
                    className={`py-1 cursor-pointer transition-all ${
                      !isCurrentMonth
                        ? 'text-zinc-300'
                        : isSelected || isTodayDay
                          ? 'bg-black text-white rounded-full'
                          : 'hover:bg-zinc-100 hover:rounded-full'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendars List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Calendars
            </h3>

            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-3 h-3 rounded-full border border-zinc-300 group-hover:bg-black group-hover:border-black transition" />
              <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition">
                My Schedule
              </span>
            </div>
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-3 h-3 rounded-full border border-zinc-300 bg-zinc-900" />
              <span className="text-sm font-medium text-zinc-900">Calls & Demos</span>
            </div>
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-3 h-3 rounded-full border border-zinc-300" />
              <span className="text-sm font-medium text-zinc-400 group-hover:text-black transition">
                Team Events
              </span>
            </div>
          </div>
        </aside>

        {/* Main Calendar */}
        <main
          className="flex-1 flex flex-col h-screen relative bg-white overflow-hidden"
          ref={horizontalScrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {viewMode === 'Week' ? (
            <>
              {/* Days Header - Week View */}
              <div className="flex border-b border-zinc-50 shrink-0">
                {/* Week Navigation */}
                <div className="w-16 flex items-center justify-center shrink-0">
                  <button
                    onClick={goToPrevWeek}
                    className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div
                  className={`flex flex-1 transition-all duration-200 ease-out ${
                    slideDirection === 'left'
                      ? '-translate-x-4 opacity-0'
                      : slideDirection === 'right'
                        ? 'translate-x-4 opacity-0'
                        : 'translate-x-0 opacity-100'
                  }`}
                >
                  {weekDays.map((day, index) => {
                    const isTodayColumn = isToday(day);
                    return (
                      <div
                        key={index}
                        className={`flex-1 py-4 text-center border-r border-zinc-50/50 relative ${
                          isTodayColumn ? 'bg-zinc-50/30' : ''
                        }`}
                      >
                        {isTodayColumn ? (
                          <>
                            <span className="text-sm text-black font-bold">
                              {format(day, 'EEE d')}
                            </span>
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full mb-2" />
                          </>
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium">
                            {format(day, 'EEE d')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Week Navigation Right */}
                <div className="w-8 flex items-center justify-center shrink-0">
                  <button
                    onClick={goToNextWeek}
                    className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

          {/* Scrollable Calendar Grid */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto relative"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="flex" style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
              {/* Time Labels */}
              <div className="w-16 flex-shrink-0 text-right pr-4 py-4 text-[10px] text-zinc-300 font-mono select-none">
                {hours.map((hour) => (
                  <div key={hour} style={{ height: HOUR_HEIGHT }}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Days Grid with Animation */}
              <div
                className={`flex-1 grid grid-cols-5 relative transition-all duration-200 ease-out ${
                  slideDirection === 'left'
                    ? '-translate-x-8 opacity-0'
                    : slideDirection === 'right'
                      ? 'translate-x-8 opacity-0'
                      : 'translate-x-0 opacity-100'
                }`}
              >
                {/* Hour Lines */}
                <div className="absolute inset-0 flex flex-col mt-3 pointer-events-none">
                  {hours.map((_, index) => (
                    <div
                      key={index}
                      className="border-b border-dashed border-zinc-100"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}
                </div>

                {/* Column Dividers */}
                <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
                  {weekDays.map((_, index) => (
                    <div key={index} className="border-r border-dashed border-zinc-50 h-full" />
                  ))}
                </div>

                {/* Current Time Indicator */}
                {currentTimePos !== null && todayColumnIndex >= 0 && (
                  <div
                    className="absolute border-t border-red-500 z-40 pointer-events-none"
                    style={{
                      top: currentTimePos,
                      left: `${(todayColumnIndex / 5) * 100}%`,
                      width: `${100 / 5}%`,
                    }}
                  >
                    <div className="absolute -left-1 -top-1 w-[7px] h-[7px] bg-red-500 rounded-full" />
                  </div>
                )}

                {/* Day Columns with Events */}
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  const isTodayColumn = isToday(day);

                  return (
                    <div
                      key={dayIndex}
                      className={`relative h-full ${isTodayColumn ? 'bg-zinc-50/30' : ''}`}
                    >
                      {dayEvents.map((event, eventIndex) => {
                        const style = getEventStyle(event);
                        if (!style) return null;

                        const isBlackCard = eventIndex === 0 && dayEvents.length > 1;

                        return (
                          <div
                            key={event.id}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDetailsModal(true);
                            }}
                            className={`event-card absolute left-2 right-2 rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group overflow-hidden ${
                              isBlackCard
                                ? 'bg-black shadow-xl shadow-zinc-200'
                                : 'bg-white border border-zinc-200'
                            } hover:scale-[1.02] hover:z-50 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]`}
                            style={{
                              top: style.top,
                              height: style.height,
                            }}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className={`text-xs font-bold ${isBlackCard ? 'text-white' : 'text-zinc-900'}`}>
                                  {event.client_name || 'Event'}
                                </h4>
                                {event.status === 'scheduled' && (
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                )}
                              </div>
                              <p className={`text-[10px] mt-0.5 font-mono ${isBlackCard ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {format(new Date(event.scheduled_time || event.scheduled_datetime || new Date()), 'HH:mm')}
                                {event.call_duration_minutes && ` - ${event.call_duration_minutes}min`}
                              </p>
                            </div>

                            {/* Hover Actions */}
                            <div className="event-actions opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-end gap-2 translate-y-2 group-hover:translate-y-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(event);
                                  setShowEventModal(true);
                                }}
                                className={`p-1.5 rounded-md transition ${
                                  isBlackCard
                                    ? 'hover:bg-white/20 text-zinc-400 hover:text-white'
                                    : 'hover:bg-zinc-100 text-zinc-400 hover:text-black'
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event);
                                }}
                                className={`p-1.5 rounded-md transition ${
                                  isBlackCard
                                    ? 'hover:bg-white/20 text-zinc-400 hover:text-white'
                                    : 'hover:bg-zinc-100 text-zinc-400 hover:text-black'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Join Call Button for black cards */}
                            {isBlackCard && style.height >= 100 && (
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex -space-x-2">
                                  <div className="w-6 h-6 rounded-full border-2 border-black bg-zinc-200" />
                                  <div className="w-6 h-6 rounded-full border-2 border-black bg-zinc-400" />
                                </div>
                                <button className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition backdrop-blur-sm">
                                  Join Call
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Empty slot placeholder */}
                      {dayEvents.length === 0 && (
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setShowEventModal(true)}
                        >
                          <Plus className="w-4 h-4 text-zinc-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
            </>
          ) : (
            /* Month View */
            <div className="flex-1 overflow-y-auto p-6">
              {/* Month Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPrevMonth}
                    className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-xl font-bold text-black">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-black transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-zinc-400">
                  {getEventsForMonth.length} events
                </span>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-px bg-zinc-100 rounded-2xl overflow-hidden">
                {/* Day Headers */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="bg-zinc-50 py-3 text-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{day}</span>
                  </div>
                ))}

                {/* Calendar Days */}
                {miniCalendarDays.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDay = isToday(day);
                  const dayEvents = getEventsForDay(day);

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        handleMiniCalendarDayClick(day);
                        if (dayEvents.length === 0) {
                          setShowEventModal(true);
                        }
                      }}
                      className={`bg-white min-h-[100px] p-2 cursor-pointer transition hover:bg-zinc-50 ${
                        !isCurrentMonth ? 'opacity-40' : ''
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full ${
                        isTodayDay ? 'bg-black text-white' : 'text-zinc-700'
                      }`}>
                        {format(day, 'd')}
                      </div>

                      {/* Events for this day */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowDetailsModal(true);
                            }}
                            className="bg-zinc-900 text-white text-[10px] font-medium px-2 py-1 rounded-md truncate hover:bg-black transition"
                          >
                            {event.client_name || 'Event'}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-zinc-400 font-medium px-2">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating Bottom Bar */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-zinc-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] rounded-full p-1.5 hover:scale-[1.01] transition duration-300">
              {/* Today Button */}
              <button
                onClick={goToToday}
                className="px-4 py-2 rounded-full text-xs font-medium text-zinc-500 hover:text-black hover:bg-zinc-50 transition"
              >
                Today
              </button>

              <div className="w-px h-4 bg-zinc-200 mx-1" />

              {/* View Mode Buttons */}
              <button
                onClick={() => setViewMode('Week')}
                className={`px-4 py-2 rounded-full text-xs transition ${
                  viewMode === 'Week'
                    ? 'bg-black text-white shadow-md font-bold'
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-50 font-medium'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('Month')}
                className={`px-4 py-2 rounded-full text-xs transition ${
                  viewMode === 'Month'
                    ? 'bg-black text-white shadow-md font-bold'
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-50 font-medium'
                }`}
              >
                Month
              </button>

              <div className="w-px h-4 bg-zinc-200 mx-2" />

              {/* Search Input */}
              {showSearch ? (
                <div className="flex items-center gap-1 bg-zinc-100 rounded-full px-3 py-1">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events..."
                    className="bg-transparent text-xs w-32 focus:outline-none text-zinc-900 placeholder-zinc-400"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="p-1 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-black transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2.5 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition"
                  title="Search"
                >
                  <Search className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
              <button
                className="p-2.5 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition"
                title="Filter (coming soon)"
              >
                <Filter className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                className="p-2.5 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition"
                title="Settings (coming soon)"
              >
                <Settings2 className="w-4 h-4" strokeWidth={2} />
              </button>

              <div className="w-px h-4 bg-zinc-200 mx-2" />

              <button
                data-action="new-event"
                onClick={() => setShowEventModal(true)}
                className="pr-4 pl-3 py-2 rounded-full hover:bg-zinc-100 text-black font-bold text-xs flex items-center gap-2 transition"
              >
                <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </div>
                New Event
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <CalendarEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        selectedDate={selectedMiniCalendarDay}
        editEvent={selectedEvent}
      />
      <CalendarEventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </DashboardLayout>
  );
};

export default React.memo(Calendar);
