import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Wrench, Calendar,
  DollarSign, Star, MessageSquare, Clock, Activity,
  CheckCircle, XCircle, AlertCircle, Bell, ArrowRight
} from 'lucide-react';
import ServiceOrbitLoader from '../components/ServiceOrbitLoader';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
  const navigate = useNavigate();
  // State for all dashboard data
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalRevenue: 0,
      revenueGrowth: 0,
      totalBookings: 0,
      bookingsGrowth: 0,
      activeCustomers: 0,
      customersGrowth: 0,
      activeTechnicians: 0,
      techniciansGrowth: 0
    },
    todayStats: {
      todayRevenue: 0,
      todayBookings: 0,
      newCustomers: 0,
      activeUsersNow: 0
    },
    pendingActions: {
      pendingApprovals: 0,
      pendingComplaints: 0,
      autoCancelledToday: 0,
      lowRatedTechs: 0
    }
  });

  const [weeklyRevenueData, setWeeklyRevenueData] = useState([]);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [revenueView, setRevenueView] = useState('weekly'); // 'weekly' or 'monthly'
  const [bookingStatusData, setBookingStatusData] = useState([]);
  const [revenueByServiceData, setRevenueByServiceData] = useState([]);
  const [revenueServiceView, setRevenueServiceView] = useState('weekly');
  const [monthlyBookingsByCategoryData, setMonthlyBookingsByCategoryData] = useState([]);
  const [selectedMonthForBookings, setSelectedMonthForBookings] = useState(new Date().getUTCMonth());
  const [peakHoursData, setPeakHoursData] = useState([]);
  const [topTechnicians, setTopTechnicians] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [mostBookedServices, setMostBookedServices] = useState([]);
  const [filteredMostBookedServices, setFilteredMostBookedServices] = useState([]);
  const [mostBookedServiceView, setMostBookedServiceView] = useState('weekly');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    completionRate: 0,
    avgResponseTime: 0,
    customerSatisfaction: 0,
    cancellationRate: 0
  });
  const [financialSummary, setFinancialSummary] = useState({
    platformEarnings: 0,
    pendingPayouts: 0,
    refundsProcessed: 0,
    paymentMethods: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use credentials: 'include' for cookie-based authentication
      const fetchOptions = {
        method: 'GET',
        credentials: 'include', // Include cookies in request
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Fetch all endpoints in parallel
      const [
        dashboardRes,
        weeklyRes,
        monthlyRes,
        statusRes,
        revenueServiceRes,
        monthlyBookingsByCategoryRes,
        peakRes,
        topTechsRes,
        topServicesRes,
        topLocationsRes,
        metricsRes,
        financialRes,
        mostBookedRes,
        categoriesRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/analytics/dashboard`, fetchOptions),
        fetch(`${API_URL}/api/analytics/weekly-revenue`, fetchOptions),
        fetch(`${API_URL}/api/analytics/monthly-revenue`, fetchOptions),
        fetch(`${API_URL}/api/analytics/booking-status`, fetchOptions),
        fetch(`${API_URL}/api/analytics/revenue-by-service?period=${revenueServiceView}`, fetchOptions),
        fetch(`${API_URL}/api/analytics/monthly-bookings-by-category`, fetchOptions),
        fetch(`${API_URL}/api/analytics/peak-hours`, fetchOptions),
        fetch(`${API_URL}/api/analytics/top-technicians`, fetchOptions),
        fetch(`${API_URL}/api/analytics/top-services`, fetchOptions),
        fetch(`${API_URL}/api/analytics/top-locations`, fetchOptions),
        fetch(`${API_URL}/api/analytics/performance-metrics`, fetchOptions),
        fetch(`${API_URL}/api/analytics/financial-summary`, fetchOptions),
        fetch(`${API_URL}/api/analytics/most-booked-services?period=${mostBookedServiceView}`, fetchOptions),
        fetch(`${API_URL}/api/service-categories`, fetchOptions)
      ]);

      // Parse responses
      const dashboard = await dashboardRes.json();
      const weekly = await weeklyRes.json();
      const monthly = await monthlyRes.json();
      const status = await statusRes.json();
      const revenueService = await revenueServiceRes.json();
      const monthlyBookingsByCategory = await monthlyBookingsByCategoryRes.json();
      const peak = await peakRes.json();
      const topTechs = await topTechsRes.json();
      const topSvcs = await topServicesRes.json();
      const topLocs = await topLocationsRes.json();
      const metrics = await metricsRes.json();
      const financial = await financialRes.json();
      const mostBooked = await mostBookedRes.json();
      const categories = await categoriesRes.json();

      // Check for authentication errors
      if (!dashboardRes.ok) {
        if (dashboardRes.status === 401) {
          throw new Error('You are not logged in. Please login as admin to view the dashboard.');
        } else if (dashboardRes.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else {
          throw new Error('Failed to load dashboard data.');
        }
      }

      // Update state
      if (dashboard.success) setDashboardData(dashboard.data);
      if (weekly.success) setWeeklyRevenueData(weekly.data);
      if (monthly.success) setMonthlyRevenueData(monthly.data);
      if (status.success) setBookingStatusData(status.data);
      if (revenueService.success) setRevenueByServiceData(revenueService.data);
      if (monthlyBookingsByCategory.success) setMonthlyBookingsByCategoryData(monthlyBookingsByCategory.data);
      if (peak.success) setPeakHoursData(peak.data);
      if (topTechs.success) setTopTechnicians(topTechs.data);
      if (topSvcs.success) setTopServices(topSvcs.data);
      if (topLocs.success) setTopLocations(topLocs.data);
      if (metrics.success) setPerformanceMetrics(metrics.data);
      if (financial.success) setFinancialSummary(financial.data);
      if (mostBooked.success) {
        setMostBookedServices(mostBooked.data);
        setFilteredMostBookedServices(mostBooked.data);
      }
      if (categories.success) {
        setAllCategories(categories.data);
      }

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly bookings by category for specific month
  const fetchMonthlyBookingsByCategory = async (month) => {
    try {
      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const res = await fetch(`${API_URL}/api/analytics/monthly-bookings-by-category?month=${month}`, fetchOptions);
      const data = await res.json();
      
      if (data.success) {
        setMonthlyBookingsByCategoryData(data.data);
      }
    } catch (err) {
      console.error('Error fetching monthly bookings by category:', err);
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
        `${API_URL}/api/analytics/revenue-by-service?period=${period}`,
        fetchOptions
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRevenueByServiceData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching revenue by service:', error);
    }
  };

  // Fetch only most booked services data
  const fetchMostBookedServices = async (period) => {
    try {
      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(
        `${API_URL}/api/analytics/most-booked-services?period=${period}`,
        fetchOptions
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMostBookedServices(data.data);
          // Apply category filter if one is selected
          if (selectedCategory) {
            const filtered = data.data.filter(service => service.categoryId && service.categoryId.toString() === selectedCategory);
            setFilteredMostBookedServices(filtered);
          } else {
            setFilteredMostBookedServices(data.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching most booked services:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAnalytics();
    fetchMonthlyBookingsByCategory(selectedMonthForBookings);
  }, []);

  // Fetch monthly bookings when month changes
  useEffect(() => {
    fetchMonthlyBookingsByCategory(selectedMonthForBookings);
  }, [selectedMonthForBookings]);

  // Refetch only revenue data when filter changes
  useEffect(() => {
    if (revenueServiceView) {
      fetchRevenueByService(revenueServiceView);
    }
  }, [revenueServiceView]);

  // Refetch most booked services when filter changes
  useEffect(() => {
    if (mostBookedServiceView) {
      fetchMostBookedServices(mostBookedServiceView);
    }
  }, [mostBookedServiceView]);

  // Generate colors for pie chart
  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#8B5CF6'];

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
    if (col.startsWith('rgb')) return col; // fallback if not hex
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
  const KPICard = ({ title, value, growth, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
            growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(growth)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  // Component: Alert Card (enhanced UI)
  const AlertCard = ({ title, count, icon: Icon, bgClass, accentClass, onClick }) => (
    <button
      onClick={onClick}
      className={`group ${bgClass} rounded-xl px-5 py-4 w-full text-left shadow-sm hover:shadow-md transition-all hover:-translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center rounded-full p-2 bg-white/40 ${accentClass}`}>
            <Icon className={`${accentClass.replace('text-', '')}`} size={20} />
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back! Here's what's happening today.</p>
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
            <p className="text-gray-600 mt-6">Loading analytics...</p>
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
        
        {/* Empty State - Show when no data exists */}
        {dashboardData.kpis.totalRevenue === 0 && 
         dashboardData.kpis.totalBookings === 0 && 
         dashboardData.kpis.activeCustomers === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mb-6">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">Welcome to Your Dashboard!</h3>
            <p className="text-blue-700 mb-4">
              Your platform is ready to go. Start by adding customers, technicians, and services to see your analytics come to life.
            </p>
            <p className="text-sm text-blue-600">
              The dashboard will automatically update as your business grows.
            </p>
          </div>
        )}

        {/* 1. Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Subscription Revenue"
            value={formatCurrency(dashboardData.kpis.totalRevenue)}
            growth={dashboardData.kpis.revenueGrowth}
            icon={DollarSign}
            color="bg-green-500"
          />
          <KPICard
            title="Total Bookings"
            value={dashboardData.kpis.totalBookings}
            growth={dashboardData.kpis.bookingsGrowth}
            icon={Calendar}
            color="bg-purple-500"
          />
          <KPICard
            title="Active Customers"
            value={dashboardData.kpis.activeCustomers}
            growth={dashboardData.kpis.customersGrowth}
            icon={Users}
            color="bg-blue-500"
          />
          <KPICard
            title="Active Technicians"
            value={dashboardData.kpis.activeTechnicians}
            growth={dashboardData.kpis.techniciansGrowth}
            icon={Wrench}
            color="bg-orange-500"
          />
        </div>

        {/* 2. Today's Activity */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="animate-pulse flex-shrink-0" size={24} />
              <h2 className="text-xl font-bold">Today's Live Activity</h2>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm animate-pulse w-auto">● LIVE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-white/80 text-sm mb-1">Revenue Today</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboardData.todayStats.todayRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm mb-1">Bookings Today</p>
              <p className="text-3xl font-bold">{dashboardData.todayStats.todayBookings}</p>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm mb-1">New Customers</p>
              <p className="text-3xl font-bold">{dashboardData.todayStats.newCustomers}</p>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm mb-1">Active Users Now</p>
              <p className="text-3xl font-bold animate-pulse">{dashboardData.todayStats.activeUsersNow}</p>
            </div>
          </div>
        </div>

        {/* 10. Quick Actions/Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AlertCard
            title="Pending Approvals"
            count={dashboardData.pendingActions.pendingApprovals}
            icon={AlertCircle}
            bgClass="bg-orange-50"
            accentClass="text-orange-700"
            onClick={() => navigate('/admin/technician-requests')}
          />
         
        </div>

        {/* 3. Booking Status & 4. Revenue Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Status 3D-like Donut Chart */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
                  </filter>
                  {bookingStatusData.map((item, index) => (
                    <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lightenDarkenColor(item.color, 28)} />
                      <stop offset="55%" stopColor={item.color} />
                      <stop offset="100%" stopColor={lightenDarkenColor(item.color, -18)} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={bookingStatusData}
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
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {bookingStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Trend Chart - Weekly/Monthly Toggle */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Earnings Trend</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setRevenueView('weekly')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    revenueView === 'weekly'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setRevenueView('monthly')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    revenueView === 'monthly'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            {revenueView === 'weekly' && (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={weeklyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      if (name === 'revenue') {
                        return [formatCurrency(value), 'Revenue'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {revenueView === 'monthly' && (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      if (name === 'revenue') {
                        return [formatCurrency(value), 'Revenue'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthly)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Bookings by Category */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Category Bookings</h3>
            <select
              value={selectedMonthForBookings}
              onChange={(e) => setSelectedMonthForBookings(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={monthlyBookingsByCategoryData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value) => [`${value} bookings`, 'Bookings']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 8, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
              >
                <LabelList
                  dataKey="bookings"
                  content={({ x, y, value }) => (
                    <text
                      x={(x || 0) + 10}
                      y={(y || 0) - 8}
                      fill="#111827"
                      fontSize={12}
                      fontWeight={700}
                      textAnchor="start"
                    >
                      {value}
                    </text>
                  )}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
          {monthlyBookingsByCategoryData.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No bookings data available for this month</p>
            </div>
          )}
        </div>

        {/* Revenue by Service Category */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Revenue by Service Category</h3>
            <div className="flex gap-2">
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
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByServiceData}>
              <CartesianGrid strokeDasharray="2 2" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" />
             
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most Booked Services Chart */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Most Booked Services</h3>
            <div className="flex gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setMostBookedServiceView('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mostBookedServiceView === 'weekly'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setMostBookedServiceView('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mostBookedServiceView === 'monthly'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setMostBookedServiceView('alltime')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mostBookedServiceView === 'alltime'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Time
                </button>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  if (e.target.value) {
                    const filtered = mostBookedServices.filter(service => service.categoryId && service.categoryId.toString() === e.target.value);
                    setFilteredMostBookedServices(filtered);
                  } else {
                    setFilteredMostBookedServices(mostBookedServices);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Categories</option>
                {allCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={filteredMostBookedServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {filteredMostBookedServices.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No services found for this category</p>
            </div>
          )}
        </div>

        {/* 11. Peak Hours Chart */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Peak Booking Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 5. Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
            <p className="text-3xl font-bold text-gray-900">{performanceMetrics.completionRate}%</p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
            <Star className="text-yellow-500 mx-auto mb-2" size={32} />
            <p className="text-3xl font-bold text-gray-900">{performanceMetrics.customerSatisfaction}/5</p>
            <p className="text-sm text-gray-600">Customer Satisfaction</p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
            <XCircle className="text-red-500 mx-auto mb-2" size={32} />
            <p className="text-3xl font-bold text-gray-900">{performanceMetrics.cancellationRate}%</p>
            <p className="text-sm text-gray-600">Cancellation Rate</p>
          </div>
        </div>

        {/* 6. Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Technicians */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🏆 Top Technicians
            </h3>
            <div className="space-y-3">
              {topTechnicians.slice(0, 5).map((tech, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{tech.name}</p>
                      <p className="text-xs text-gray-600">{tech.completed} completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <span className="font-bold text-sm">{tech.rating}</span>
                    </div>
                    <p className="text-xs text-green-600">{formatCurrency(tech.earnings)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Services */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              ⭐ Top Services
            </h3>
            <div className="space-y-3">
              {topServices.slice(0, 5).map((service, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{service.name}</p>
                    <div className={`flex items-center gap-1 text-sm ${
                      service.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {service.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{Math.abs(service.trend)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{service.bookings} bookings</span>
                    <span className="text-green-600 font-semibold">{formatCurrency(service.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Locations */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              📍 Top Locations
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {topLocations.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <p className="font-semibold text-gray-900">{location.city}</p>
                  </div>
                  <p className="font-bold text-blue-600">{location.bookings}</p>
                </div>
              ))}
            </div>
          </div>
        </div>



        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
      )}
    </div>
  );
};


