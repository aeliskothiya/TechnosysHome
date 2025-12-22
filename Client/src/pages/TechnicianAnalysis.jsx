import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Star,
  Clock, CheckCircle, XCircle, AlertCircle, Wallet,
  Activity, MessageSquare, ArrowRight, CreditCard, MapPin,
  BarChart3, TrendingDown as TrendingDownIcon
} from 'lucide-react';
import ServiceOrbitLoader from '../components/ServiceOrbitLoader';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function TechnicianAnalysis() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  
  // Coin Badge Component
  const CoinBadge = ({ coins }) => (
    <div className=" py-1 px-3 rounded-full inline-flex items-center gap-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-300/40">
      <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
        <span className="text-gray-900 font-bold text-[10px]">C</span>
      </div>
      <span className="font-semibold text-black text-xs whitespace-nowrap">{Number(coins).toFixed(2)}</span>
    </div>
  );
  
  // State for all dashboard data
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalEarnings: 0,
      walletBalance: 0,
      totalBookings: 0,
      avgRating: 0,
      totalReviews: 0
    },
    todayStats: {
      todayBookings: 0,
      todayEarnings: 0,
      activeBookings: 0,
      completedToday: 0,
      hoursWorked: 0
    },
    performance: {
      completionRate: 0,
      cancellationRate: 0,
      totalReviews: 0,
      avgRating: 0
    },
    alerts: {
      activeComplaints: 0,
      pendingBookings: 0,
      subscriptionStatus: 'No Active Subscription',
      daysRemaining: 0,
      availabilityStatus: 'Not Available'
    },
    financial: {
      pendingPayouts: 0,
      totalEarnings: 0,
      walletBalance: 0,
      platformCommission: 0
    },
    subscription: {
      plan: 'N/A',
      status: 'No Active Subscription',
      expiryDate: null,
      daysRemaining: 0
    }
  });

  const [weeklyEarnings, setWeeklyEarnings] = useState([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [monthlyEarningsData, setMonthlyEarningsData] = useState([]);
  const [earningsView, setEarningsView] = useState('weekly');
  const [bookingStatus, setBookingStatus] = useState([]);
  const [revenueByService, setRevenueByService] = useState([]);
  const [revenueServiceView, setRevenueServiceView] = useState('weekly');
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [mostBookedServices, setMostBookedServices] = useState([]);
  const [ratingTrend, setRatingTrend] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionPageSize = 5;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = backendUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  // Pagination for transactions
  const transactionTotalPages = Math.ceil(recentTransactions.length / transactionPageSize) || 1;
  const paginatedTransactions = recentTransactions.slice(
    (transactionPage - 1) * transactionPageSize,
    transactionPage * transactionPageSize
  );

  // Pagination Component
  const Pagination = ({ page, totalPages, onChange }) => {
    const getPages = () => {
      let arr = [];
      arr.push(1);

      if (page > 3) arr.push("...");

      for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < totalPages) arr.push(p);
      }

      if (page < totalPages - 2) arr.push("...");

      if (totalPages > 1) arr.push(totalPages);

      return arr;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-6 select-none">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === 1
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-3 py-2 text-gray-500">…</span>
          ) : (
            <button
              key={i}
              onClick={() => onChange(p)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm border transition-all ${
                p === page
                  ? "bg-gray-900 text-white shadow-md scale-110 border-gray-900"
                  : "hover:bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === totalPages
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Fetch all endpoints in parallel
      const [
        dashboardRes,
        weeklyRes,
        monthlyRes,
        monthlyByMonthRes,
        statusRes,
        revenueServiceRes,
        feedbackRes,
        upcomingRes,
        mostBookedRes,
        ratingTrendRes,
        transactionsRes,
        peakHoursRes,
        locationsRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/technician-analytics/dashboard`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/weekly-earnings`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/monthly-earnings`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/monthly-earnings-by-month`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/booking-status`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/revenue-by-service?period=${revenueServiceView}`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/recent-feedback`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/upcoming-bookings`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/most-booked-services`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/rating-trend`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/recent-transactions`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/peak-hours`, fetchOptions),
        fetch(`${API_URL}/api/technician-analytics/top-locations`, fetchOptions)
      ]);

      // Check for authentication errors
      if (!dashboardRes.ok) {
        if (dashboardRes.status === 401) {
          throw new Error('You are not logged in. Please login to view the dashboard.');
        } else if (dashboardRes.status === 403) {
          throw new Error('Access denied.');
        } else {
          throw new Error('Failed to load dashboard data.');
        }
      }

      // Parse responses
      const dashboard = await dashboardRes.json();
      const weekly = await weeklyRes.json();
      const monthly = await monthlyRes.json();
      const monthlyByMonth = await monthlyByMonthRes.json();
      const status = await statusRes.json();
      const revenueService = await revenueServiceRes.json();
      const feedback = await feedbackRes.json();
      const upcoming = await upcomingRes.json();
      const mostBooked = await mostBookedRes.json();
      const ratingData = await ratingTrendRes.json();
      const transactions = await transactionsRes.json();
      const peakData = await peakHoursRes.json();
      const locationData = await locationsRes.json();

      // Update state
      if (dashboard.success) setDashboardData(dashboard.data);
      if (weekly.success) setWeeklyEarnings(weekly.data);
      if (monthly.success) setMonthlyEarnings(monthly.data);
      if (monthlyByMonth.success) setMonthlyEarningsData(monthlyByMonth.data);
      if (status.success) setBookingStatus(status.data);
      if (revenueService.success) setRevenueByService(revenueService.data);
      if (feedback.success) setRecentFeedback(feedback.data);
      if (upcoming.success) setUpcomingBookings(upcoming.data);
      if (mostBooked.success) setMostBookedServices(mostBooked.data);
      if (ratingData.success) setRatingTrend(ratingData.data);
      if (transactions.success) setRecentTransactions(transactions.data);
      if (peakData.success) setPeakHours(peakData.data);
      if (locationData.success) setTopLocations(locationData.data);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch only revenue by service data
  const fetchRevenueByService = async (period) => {
    try {
      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(
        `${API_URL}/api/technician-analytics/revenue-by-service?period=${period}`,
        fetchOptions
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRevenueByService(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching revenue by service:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Refetch only revenue data when filter changes
  useEffect(() => {
    if (revenueServiceView) {
      fetchRevenueByService(revenueServiceView);
    }
  }, [revenueServiceView]);

  // Helper: Smart currency formatter (shows actual number if small, K/M/B if large)
  const formatCurrency = (amount) => {
    if (amount === 0) return '₹0';
    if (amount < 1000) return `₹${Math.round(amount).toLocaleString()}`;
    if (amount < 1000000) return `₹${(amount / 1000).toFixed(1)}K`;
    if (amount < 1000000000) return `₹${(amount / 1000000).toFixed(1)}M`;
    return `₹${(amount / 1000000000).toFixed(1)}B`;
  };

  // Helper: lighten/darken hex color for gradient shading
  const lightenDarkenColor = (hex, amt) => {
    if (!hex) return '#999999';
    let col = hex.trim();
    if (col.startsWith('rgb')) return col;
    if (col[0] === '#') col = col.slice(1);
    if (col.length === 3) col = col.split('').map(c => c + c).join('');
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  };

  // Component: KPI Card
  const KPICard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <div 
      className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  // Component: Alert Card
  const AlertCard = ({ title, count, icon: Icon, bgClass, accentClass, onClick }) => (
    <button
      onClick={onClick}
      className={`group ${bgClass} rounded-xl px-5 py-4 w-full text-left shadow-sm hover:shadow-md transition-all hover:-translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center rounded-full p-2 bg-white/40 ${accentClass}`}>
            <Icon size={20} />
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-2xl font-extrabold">{count}</p>
          </div>
        </div>
        <ArrowRight size={20} className="opacity-60 group-hover:opacity-100" />
      </div>
    </button>
  );

  // Memoized Earnings Chart Component
  const EarningsChart = useMemo(() => {
    const currentData = earningsView === 'weekly' ? weeklyEarnings : monthlyEarningsData;
    const dataKey = earningsView === 'weekly' ? 'day' : 'month';
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={currentData}>
          <defs>
            <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis />
          <Tooltip 
            formatter={(value) => formatCurrency(value)}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
          />
          <Area type="monotone" dataKey="earnings" stroke="#10B981" fillOpacity={1} fill="url(#colorEarnings)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }, [earningsView, weeklyEarnings, monthlyEarningsData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Analytics Dashboard</h1>
              <p className="text-sm text-gray-600">Track your performance, earnings, and insights</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ServiceOrbitLoader show={true} size={120} />
            <p className="text-gray-600 mt-6">Loading your analytics...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="text-red-500 mx-auto mb-3" size={48} />
            <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          
          {/* 1. Key Metrics (KPI Cards) */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-purple-600" size={20} />
              Key Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Earnings"
                value={formatCurrency(dashboardData.kpis.totalEarnings)}
                subtitle="All-time revenue"
                icon={DollarSign}
                color="bg-green-500"
              />
              <KPICard
                title="Wallet Balance"
                value={formatCurrency(dashboardData.kpis.walletBalance)}
                subtitle="Available balance"
                icon={Wallet}
                color="bg-blue-500"
                onClick={() => navigate('/technician/subscription')}
              />
              <KPICard
                title="Total Bookings"
                value={dashboardData.kpis.totalBookings}
                subtitle="All-time bookings"
                icon={Calendar}
                color="bg-purple-500"
              />
              <KPICard
                title="Average Rating"
                value={dashboardData.kpis.avgRating}
                subtitle={`${dashboardData.kpis.totalReviews} reviews`}
                icon={Star}
                color="bg-yellow-500"
              />
            </div>
          </div>

          {/* 2. Today's Activity */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              Today's Activity
            </h2>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="animate-pulse flex-shrink-0" size={24} />
                  <h3 className="text-xl font-bold">Live Activity</h3>
                </div>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm animate-pulse w-auto">● LIVE</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-white/80 text-sm mb-1">Bookings Today</p>
                  <p className="text-3xl font-bold">{dashboardData.todayStats.todayBookings}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm mb-1">Earnings Today</p>
                  <p className="text-3xl font-bold">{formatCurrency(dashboardData.todayStats.todayEarnings)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm mb-1">Active Bookings</p>
                  <p className="text-3xl font-bold animate-pulse">{dashboardData.todayStats.activeBookings}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm mb-1">Completed Today</p>
                  <p className="text-3xl font-bold">{dashboardData.todayStats.completedToday}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm mb-1">Hours Worked</p>
                  <p className="text-3xl font-bold">{dashboardData.todayStats.hoursWorked}h</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Financial Overview */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="text-green-600" size={20} />
              Financial Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="text-green-600" size={20} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">This Month's Earnings</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyEarnings)}</p>
              </div>
           
            </div>
          </div>

          {/* 4. Alerts & Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="text-orange-600" size={20} />
              Alerts & Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AlertCard
                title="Pending Bookings"
                count={dashboardData.alerts.pendingBookings}
                icon={Clock}
                bgClass="bg-orange-50"
                accentClass="text-orange-700"
                onClick={() => navigate('/technician/bookings')}
              />
              <AlertCard
                title="Active Complaints"
                count={dashboardData.alerts.activeComplaints}
                icon={MessageSquare}
                bgClass="bg-red-50"
                accentClass="text-red-700"
                onClick={() => navigate('/technician/feedbacks')}
              />
              <AlertCard
                title="Availability"
                count={dashboardData.alerts.availabilityStatus}
                icon={Activity}
                bgClass={dashboardData.alerts.availabilityStatus === 'Available' ? "bg-green-50" : "bg-gray-50"}
                accentClass={dashboardData.alerts.availabilityStatus === 'Available' ? "text-green-700" : "text-gray-700"}
                onClick={() => navigate('/technician/availability')}
              />
            </div>
          </div>

          {/* 5. Booking Statistics - Charts Row */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={20} />
              Booking Statistics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking Status 3D Donut */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
                      </filter>
                      {bookingStatus.map((item, index) => (
                        <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lightenDarkenColor(item.color, 28)} />
                          <stop offset="55%" stopColor={item.color} />
                          <stop offset="100%" stopColor={lightenDarkenColor(item.color, -18)} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={bookingStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={60}
                      padAngle={2}
                      cornerRadius={6}
                      fill="#8884d8"
                      dataKey="value"
                      filter="url(#donutShadow)"
                    >
                      {bookingStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {bookingStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings Chart with Toggle */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Earnings Trend</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEarningsView('weekly')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        earningsView === 'weekly'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setEarningsView('monthly')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        earningsView === 'monthly'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                {EarningsChart}
              </div>
            </div>
          </div>

          {/* 6. Service Analytics */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-cyan-600" size={20} />
              Service Analytics
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {/* Revenue by Service */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Revenue by Service Type</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRevenueServiceView('alltime')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        revenueServiceView === 'alltime'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setRevenueServiceView('weekly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        revenueServiceView === 'weekly'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setRevenueServiceView('monthly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        revenueServiceView === 'monthly'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                {revenueByService.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByService}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'Revenue (₹)' || name === 'revenue') {
                            return [formatCurrency(value), 'Revenue'];
                          }
                          return [value, name];
                        }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    <p>No service data available yet</p>
                  </div>
                )}
              </div>

              {/* Most Booked Services */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Most Booked Services</h3>
                {mostBookedServices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mostBookedServices} layout="vertical" margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={115} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    <p>No booking data available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. Performance Metrics */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="text-yellow-600" size={20} />
              Performance Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
                <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                <p className="text-3xl font-bold text-gray-900">{dashboardData.performance.completionRate}%</p>
                <p className="text-sm text-gray-600">Completion Rate</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
                <XCircle className="text-red-500 mx-auto mb-2" size={32} />
                <p className="text-3xl font-bold text-gray-900">{dashboardData.performance.cancellationRate}%</p>
                <p className="text-sm text-gray-600">Cancellation Rate</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
                <Star className="text-yellow-500 mx-auto mb-2" size={32} />
                <p className="text-3xl font-bold text-gray-900">{dashboardData.performance.avgRating}/5</p>
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
              </div>
            </div>
          </div>

          {/* 8. Rating Trend */}
          {ratingTrend.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Rating Trend (Last 6 Months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={ratingTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rating" stroke="#F59E0B" strokeWidth={3} name="Average Rating" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 9. Additional Insights */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="text-red-600" size={20} />
              Additional Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Peak Hours */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Booking Hours</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Locations */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  📍 Top Service Locations
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {topLocations.length > 0 ? topLocations.map((location, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="font-semibold text-gray-900">{location.city}</p>
                      </div>
                      <p className="font-bold text-blue-600">{location.bookings} bookings</p>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-6">No location data</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 10. Upcoming Bookings & Recent Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="text-blue-600" size={18} />
                Upcoming Bookings
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {upcomingBookings.length > 0 ? upcomingBookings.map((booking, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{booking.serviceName}</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        booking.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                        booking.status === 'Accepted' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{booking.customerName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.timeSlot}
                    </p>
                    {booking.customerPhone && (
                      <p className="text-xs text-gray-400 mt-1">{booking.customerPhone}</p>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-6">No upcoming bookings</p>
                )}
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="text-yellow-500" size={18} />
                Recent Customer Reviews
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentFeedback.length > 0 ? recentFeedback.map((feedback, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{feedback.customerName}</p>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={14} fill="currentColor" />
                        <span className="font-bold text-sm">{feedback.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{feedback.review}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(feedback.date).toLocaleDateString()}
                    </p>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-6">No reviews yet</p>
                )}
              </div>
            </div>
          </div>

          {/* 11. Recent Coin Usage History */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="text-purple-600" size={18} />
              Recent Coin Usage History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Service Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Coins Used</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length > 0 ? paginatedTransactions.map((txn, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {txn.serviceName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {txn.categoryName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <CoinBadge coins={txn.coinsUsed} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          txn.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          txn.status === 'In-Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
                        {new Date(txn.date).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-500">No coin usage history yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {recentTransactions.length > transactionPageSize && (
              <Pagination
                page={transactionPage}
                totalPages={transactionTotalPages}
                onChange={(p) => setTransactionPage(p)}
              />
            )}
          </div>


          {/* Footer */}
          <div className="text-center text-gray-500 text-sm py-4">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
