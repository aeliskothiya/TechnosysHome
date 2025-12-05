import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import ArrivalOTPModal from '../components/ArrivalOTPModal';
import { Search, Calendar, CheckCircle, Clock, User, MapPin, Phone, Package } from 'lucide-react';

const TechnicianBookings = () => {
  const { backendUrl, userData } = useContext(AppContext);
  
  // View state: 'active' or 'completed'
  const [currentView, setCurrentView] = useState('active');
  
  // Separate state for each view
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // OTP handling
  const [generatingOTP, setGeneratingOTP] = useState(null);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);
  const [completingService, setCompletingService] = useState(null);

  // Separate pagination for each view
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const pageSize = 5;

  // Pagination Component (Matching AdminCategories)
  const Pagination = ({ page, totalPages, onChange }) => {
    const getPages = () => {
      let pages = [];
      pages.push(1);

      if (page > 3) pages.push("left-gap");

      for (let p = page - 1; p <= page + 1; p++) {
        if (p > 1 && p < totalPages) pages.push(p);
      }

      if (page < totalPages - 2) pages.push("right-gap");

      if (totalPages > 1) pages.push(totalPages);

      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-6 select-none">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

        {getPages().map((p, i) =>
          p === "left-gap" || p === "right-gap" ? (
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
            page === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // Fetch Accepted Bookings
  const fetchAccepted = async () => {
    setLoadingAccepted(true);
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/bookings/technician/accepted`,
        { withCredentials: true }
      );
      if (data.success && Array.isArray(data.bookings)) {
        setAcceptedBookings(data.bookings);
      }
    } catch (e) {
      console.error('Failed to fetch accepted bookings', e);
    } finally {
      setLoadingAccepted(false);
    }
  };

  // Fetch Completed Bookings
  const fetchCompleted = async () => {
    setLoadingCompleted(true);
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/bookings/technician/completed`,
        { withCredentials: true }
      );
      if (data.success && Array.isArray(data.bookings)) {
        setCompletedBookings(data.bookings);
      }
    } catch (e) {
      console.error('Failed to fetch completed bookings', e);
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'technician') {
      fetchAccepted();
    }
  }, [backendUrl, userData?.role]);

  // Fetch completed when switching to completed view
  useEffect(() => {
    if (currentView === 'completed' && userData?.role === 'technician' && completedBookings.length === 0) {
      fetchCompleted();
    }
  }, [currentView, userData?.role]);

  // Handle "Arrived" button
  const handleArrived = async (bookingId) => {
    setGeneratingOTP(bookingId);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/bookings/generate-arrival-otp`,
        { bookingId },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success('OTP sent to customer email');
        setSelectedBookingForOTP(bookingId);
      } else {
        toast.error(data.message || 'Failed to generate OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setGeneratingOTP(null);
    }
  };

  // Handle OTP verification success
  const handleOTPSuccess = () => {
    setSelectedBookingForOTP(null);
    if (currentView === 'active') {
      fetchAccepted();
    } else {
      fetchCompleted();
    }
  };

  // Handle OTP modal close
  const handleOTPClose = () => {
    setSelectedBookingForOTP(null);
  };

  // Handle Service Done button
  const handleServiceDone = async (bookingId) => {
    setCompletingService(bookingId);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/bookings/generate-completion-otp`,
        { bookingId },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success('Completion OTP sent to customer email');
        setSelectedBookingForOTP(bookingId);
      } else {
        toast.error(data.message || 'Failed to generate completion OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate completion OTP');
    } finally {
      setCompletingService(null);
    }
  };

  if (userData?.role !== 'technician') {
    return <div className='p-6 text-center text-red-600'>Technician access required.</div>;
  }

  // Current list and pagination
  const currentList = currentView === 'active' ? acceptedBookings : completedBookings;
  const currentLoading = currentView === 'active' ? loadingAccepted : loadingCompleted;
  const currentPage = currentView === 'active' ? activePage : completedPage;
  const setCurrentPage = currentView === 'active' ? setActivePage : setCompletedPage;

  // Filter by search
  const filteredList = currentList.filter((b) => {
    const term = searchTerm.toLowerCase();
    const service = b.SubCategoryID?.name?.toLowerCase() || '';
    const customer = b.CustomerID?.Name?.toLowerCase() || 
                      `${b.CustomerID?.FirstName} ${b.CustomerID?.LastName}`.toLowerCase() || '';
    const status = b.Status?.toLowerCase() || '';
    return service.includes(term) || customer.includes(term) || status.includes(term);
  });

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats for active bookings
  const confirmedCount = acceptedBookings.filter(b => b.Status === 'Confirmed').length;
  const inProgressCount = acceptedBookings.filter(b => b.Status === 'In-Progress').length;
  const totalActive = acceptedBookings.length;

  // Stats for completed bookings
  const totalCompleted = completedBookings.length;

  // Check if technician has an active in-progress service
  const hasActiveService = acceptedBookings.some(b => b.Status === 'In-Progress');

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
            My Bookings Management
          </h1>
          <p className='text-gray-600 text-lg max-w-2xl mx-auto'>
            Manage your active and completed service bookings in one place
          </p>
        </div>

        {/* View Toggle */}
        <div className='mb-8 flex justify-center'>
          <div className='bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-1 inline-flex shadow-lg'>
            <button
              onClick={() => {
                setCurrentView('active');
                setSearchTerm('');
              }}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                currentView === 'active'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Clock className='h-5 w-5' />
              <span className='font-medium'>Active Bookings</span>
            </button>
            <button
              onClick={() => {
                setCurrentView('completed');
                setSearchTerm('');
              }}
              className={`px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 ${
                currentView === 'completed'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CheckCircle className='h-5 w-5' />
              <span className='font-medium'>Completed Bookings</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {currentView === 'active' ? (
          <div className='mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6'>
            <div className='bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-3xl font-bold text-gray-900'>{totalActive}</div>
                  <div className='text-sm text-gray-600 mt-1'>Total Active</div>
                </div>
                <div className='p-3 bg-blue-100 rounded-xl'>
                  <Calendar className='h-6 w-6 text-blue-600' />
                </div>
              </div>
            </div>

            <div className='bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-3xl font-bold text-yellow-600'>{confirmedCount}</div>
                  <div className='text-sm text-gray-600 mt-1'>Confirmed</div>
                </div>
                <div className='p-3 bg-yellow-100 rounded-xl'>
                  <Clock className='h-6 w-6 text-yellow-600' />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6'>
            <div className='bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 text-left shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-3xl font-bold text-gray-900'>{totalCompleted}</div>
                  <div className='text-sm text-gray-600 mt-1'>Total Completed</div>
                </div>
                <div className='p-3 bg-purple-100 rounded-xl'>
                  <CheckCircle className='h-6 w-6 text-purple-600' />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className='bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8'>
          <div className='relative flex-1 w-full'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='Search by service, customer, or status...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm'
            />
          </div>
        </div>

        {/* Bookings List */}
        <div className='bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden'>
          {currentLoading ? (
            <div className='text-center py-16'>
              <Clock className='h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin' />
              <h3 className='text-2xl font-semibold text-gray-900 mb-3'>Loading bookings...</h3>
              <p className='text-gray-500'>Please wait while we fetch your bookings</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className='text-center py-16'>
              <Calendar className='h-16 w-16 text-gray-400 mx-auto mb-4' />
              <h3 className='text-2xl font-semibold text-gray-900 mb-3'>No bookings found</h3>
              <p className='text-gray-500 mb-6 max-w-md mx-auto'>
                {searchTerm ? 'Try adjusting your search terms' : `No ${currentView} bookings available at the moment`}
              </p>
            </div>
          ) : (
            <>
              <div className='divide-y divide-gray-200'>
                {paginatedList.map((b) => (
                  <div
                    key={b._id}
                    className='hover:bg-gray-50/50 transition-colors duration-200'
                  >
                    <div className='px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
                      <div className='flex items-start space-x-4 flex-1 min-w-0'>
                        {b.SubCategoryID?.image ? (
                          <img
                            src={`${backendUrl}${b.SubCategoryID.image}`}
                            alt={b.SubCategoryID.name}
                            className='h-16 w-16 rounded-lg object-cover shadow-sm'
                          />
                        ) : (
                          <div className='h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm'>
                            <Package className='h-8 w-8 text-white' />
                          </div>
                        )}

                        <div className='flex-1'>
                          <div className='flex items-center space-x-3 mb-2'>
                            <div className='text-lg font-semibold text-gray-900'>
                              {b.SubCategoryID?.name || 'Service'}
                            </div>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                b.Status === 'Confirmed'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  : b.Status === 'In-Progress'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-green-100 text-green-800 border border-green-200'
                              }`}
                            >
                              {b.Status}
                            </span>
                          </div>

                          <div className='flex items-center space-x-4 text-sm text-gray-600 mb-3'>
                            <div className='flex items-center space-x-1'>
                              <Calendar className='h-4 w-4' />
                              <span>{new Date(b.Date).toLocaleDateString()}</span>
                            </div>
                            <div className='flex items-center space-x-1'>
                              <Clock className='h-4 w-4' />
                              <span>{b.TimeSlot}</span>
                            </div>
                          </div>

                          {b.SubCategoryID?.coinsRequired !== undefined && (
                            <div className='flex items-center space-x-2 text-purple-600 font-medium mb-3'>
                              <div className='flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full'>
                                <span className='text-xs font-bold text-black'>C</span>
                              </div>
                              <span className='text-sm'>{b.SubCategoryID.coinsRequired} coins used</span>
                            </div>
                          )}

                          {b.CustomerID && (
                            <div className='bg-blue-50/50 rounded-lg p-3 border border-blue-100'>
                              <div className='flex items-center space-x-2 mb-2'>
                                <User className='h-4 w-4 text-blue-600' />
                                <span className='text-sm font-semibold text-gray-800'>
                                  {b.CustomerID.Name || 
                                   (b.CustomerID.FirstName && b.CustomerID.LastName 
                                     ? `${b.CustomerID.FirstName} ${b.CustomerID.LastName}`.trim()
                                     : b.CustomerID.FirstName || b.CustomerID.LastName || 'Customer')}
                                </span>
                              </div>

                              {b.CustomerID.Address && (
                                <div className='flex items-start space-x-2 mb-1'>
                                  <MapPin className='h-4 w-4 text-gray-500 mt-0.5' />
                                  <span className='text-sm text-gray-600'>
                                    {b.CustomerID.Address.houseNumber || b.CustomerID.Address.house_no},{' '}
                                    {b.CustomerID.Address.street || b.CustomerID.Address.road},{' '}
                                    {b.CustomerID.Address.city || b.CustomerID.Address.town},{' '}
                                    {b.CustomerID.Address.pincode || b.CustomerID.Address.postcode}
                                  </span>
                                </div>
                              )}

                              {(b.CustomerID.Mobile || b.CustomerID.MobileNumber || b.CustomerID.Phone) && (
                                <div className='flex items-center space-x-2'>
                                  <Phone className='h-4 w-4 text-gray-500' />
                                  <span className='text-sm text-gray-600'>
                                    {b.CustomerID.Mobile || b.CustomerID.MobileNumber || b.CustomerID.Phone}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Completed timestamp */}
                          {currentView === 'completed' && b.CompletedAt && (
                            <div className='flex items-center space-x-2 text-sm text-green-600 mt-3'>
                              <CheckCircle className='h-4 w-4' />
                              <span>Completed on: {new Date(b.CompletedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons (only for active bookings) */}
                      {currentView === 'active' && (
                        <div className='flex flex-col space-y-2 sm:w-48'>
                          {b.Status === 'Confirmed' && !b.arrivalVerified && (
                            <>
                              <button
                                onClick={() => handleArrived(b._id)}
                                disabled={generatingOTP === b._id || hasActiveService}
                                className='w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:scale-100'
                              >
                                {generatingOTP === b._id ? 'Sending OTP...' : 'I Have Arrived'}
                              </button>
                              {hasActiveService && b.Status === 'Confirmed' && (
                                <p className='text-xs text-orange-600 text-center mt-1'>
                                  Complete current service first
                                </p>
                              )}
                            </>
                          )}

                          {b.Status === 'In-Progress' && b.arrivalVerified && (
                            <button
                              onClick={() => handleServiceDone(b._id)}
                              disabled={completingService === b._id}
                              className='w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:scale-100'
                            >
                              {completingService === b._id ? 'Sending OTP...' : 'Service Completed'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredList.length > pageSize && (
                <div className='px-6 py-4 border-t border-gray-200'>
                  <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {selectedBookingForOTP && (
        <ArrivalOTPModal
          bookingId={selectedBookingForOTP}
          backendUrl={backendUrl}
          onClose={handleOTPClose}
          onSuccess={handleOTPSuccess}
          mode={
            [...acceptedBookings, ...completedBookings].find(b => b._id === selectedBookingForOTP)?.Status === 'In-Progress' 
              ? 'completion' 
              : 'arrival'
          }
        />
      )}
    </div>
  );
};

export default TechnicianBookings;
