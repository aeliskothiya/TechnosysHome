import React, { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import { 
  Calendar, 
  Clock, 
  Save, 
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import ServiceOrbitLoader from "../components/ServiceOrbitLoader";

// Simple availability UI: pick a date and select hourly slots (08:00-20:00)
export default function TechnicianAvailability() {
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Use local date string (YYYY-MM-DD) to avoid UTC timezone shifts
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  // Helper to format a Date to local YYYY-MM-DD (avoids UTC conversion issues)
  const formatLocalDate = (dt) => {
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  // Prevent selecting past dates in calendar (local date)
  const minDate = formatLocalDate(new Date()); // today

  // Handle outside click to close calendar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate calendar days
  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays(calendarMonth);
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const todayStr = formatLocalDate(today);
  
  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
  };
  
  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
  };
  
  const handleDateSelect = (day) => {
    const selectedDate = formatLocalDate(day);
    if (selectedDate >= minDate) {
      setDate(selectedDate);
      setShowCalendar(false);
    }
  };
  
  const handleTodayClick = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCalendarMonth(tomorrow);
    const tomorrowStr = formatLocalDate(tomorrow);
    setDate(tomorrowStr);
  };

  const generateSlots = () => {
    const slots = [];
    for (let h = 8; h < 20; h++) {
      const start = String(h).padStart(2, "0") + ":00";
      const end = String(h + 1).padStart(2, "0") + ":00";
      slots.push(`${start}-${end}`);
    }
    return slots;
  };

  const allSlots = generateSlots();
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [existingSlots, setExistingSlots] = useState([]); // from server
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { backendUrl } = useContext(AppContext);

  useEffect(() => {
    // fetch existing availability for the date when date changes
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${backendUrl}/api/technician-availability`, {
          params: { date },
          withCredentials: true,
        });

        if (data && data.data && Array.isArray(data.data.timeSlots)) {
          setExistingSlots(data.data.timeSlots.map((t) => t.slot));
          setSelectedSlots(
            data.data.timeSlots.map((t) => (t.status === "available" ? t.slot : null)).filter(Boolean)
          );
        } else {
          setExistingSlots([]);
          setSelectedSlots([]);
        }
      } catch (err) {
        // If unauthenticated or any error, clear slots
        console.error("Failed to fetch availability:", err.response?.data || err.message);
        setExistingSlots([]);
        setSelectedSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [date, backendUrl]);

  const toggleSlot = (slot) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleSubmit = async () => {
    // client-side validation: prevent submitting past dates
    if (date < minDate) {
      toast.error("Please select today or a future date");
      return;
    }
    try {
      setSaving(true);
      const payload = { date, timeSlots: selectedSlots };
      const { data } = await axios.post(`${backendUrl}/api/technician-availability`, payload, { withCredentials: true });
      if (data && data.success) {
        toast.success("Availability saved successfully!");
        setExistingSlots(selectedSlots);
      } else {
        toast.error(data.message || "Failed to save availability");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving availability: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedSlots([]);
    toast.info("Selection cleared");
  };

  const selectAllToggle = () => {
    // Always select all slots (remove deselect behavior)
    setSelectedSlots(allSlots);
    toast.info("Selected all slots");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Technician Availability
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Set your availability for specific dates and time slots
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
          {/* Date Selection & Stats */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Calendar Picker */}
            <div className="md:col-span-1 relative" ref={calendarRef}>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
              <div className="relative w-full">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white hover:border-blue-400 transition-all duration-300 flex items-center justify-between text-gray-700 font-medium hover:bg-blue-50"
                >
                  <span className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </button>

                {/* Calendar Dropdown */}
                {showCalendar && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200/50 p-3 z-50 w-full md:w-96">
                    {/* Month/Year Header */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                      </button>
                      <h3 className="font-semibold text-gray-900 text-center flex-1 text-sm">{monthName}</h3>
                      <button
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1 mb-3">
                      {calendarDays.map((day, index) => {
                        if (!day) {
                          return <div key={`empty-${index}`} />;
                        }
                        const dayStr = formatLocalDate(day);
                        const isSelected = dayStr === date;
                        const isToday = dayStr === todayStr;
                        const isDisabled = dayStr < minDate;
                        const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

                        return (
                          <button
                            key={dayStr}
                            onClick={() => handleDateSelect(day)}
                            disabled={isDisabled || !isCurrentMonth}
                            className={`
                              py-1.5 px-0.5 text-xs rounded-lg font-medium transition-all duration-200 
                              ${isSelected 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' 
                                : isToday
                                ? 'bg-gray-200 text-gray-900 border-2 border-gray-400'
                                : isDisabled || !isCurrentMonth
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent hover:border-blue-300'
                              }
                            `}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleTodayClick}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats & Legend */}
            <div className="md:col-span-2 bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedSlots.length}</div>
                  <div className="text-sm text-gray-600">Selected Slots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{allSlots.length}</div>
                  <div className="text-sm text-gray-600">Total Slots</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm" />
                  <span className="text-gray-700">Selected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-sm" />
                  <span className="text-gray-700">Existing</span>
                </div>
                {/* <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full shadow-sm" />
                  <span className="text-gray-700">Available</span>
                </div> */}
              </div>
            </div>
          </div>

          {/* Time Slots Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Available Time Slots (8:00 AM - 8:00 PM)</span>
              </h3>
              <div className="text-sm text-gray-600">
                Click to select/deselect slots
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-2xl border border-gray-200/50">
                <ServiceOrbitLoader show={true} size={80} speed={700} />
                <p className="text-gray-600 mt-4">Loading availability...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allSlots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot);
                  const isExisting = existingSlots.includes(slot);
                  
                  let className = "text-sm rounded-xl px-4 py-3 border-2 flex items-center justify-center select-none transition-all duration-300 hover:scale-105 font-medium ";
                  
                  if (isSelected) {
                    className += "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-500 shadow-lg transform scale-105";
                  } else if (isExisting) {
                    className += "bg-yellow-100 text-yellow-800 border-yellow-300 shadow-md";
                  } else {
                    className += "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 shadow-sm";
                  }

                  return (
                    <button 
                      key={slot} 
                      type="button" 
                      onClick={() => toggleSlot(slot)} 
                      className={className}
                      disabled={loading}
                    >
                      <span className="text-center leading-tight">
                        {slot.split('-').join('\n')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-6 border-t border-gray-200/50">
            <button
              onClick={selectAllToggle}
              disabled={loading || saving || allSlots.length === 0 || selectedSlots.length === allSlots.length}
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-sm"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Select All</span>
            </button>

            <button
              onClick={clearSelection}
              disabled={loading || saving || selectedSlots.length === 0}
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={loading || saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? "Saving..." : "Save Availability"}</span>
            </button>
          </div>
        </div>

        {/* Information Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>How it works?</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <p>• Select a date to view and manage availability</p>
              <p>• Click time slots to mark them as available</p>
              <p>• Green slots are currently selected</p>
            </div>
            <div className="space-y-2">
              <p>• Yellow slots show existing availability</p>
              <p>• Changes are saved only when you click "Save Availability"</p>
              <p>• You can clear all selections at any time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}