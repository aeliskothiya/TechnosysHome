// import React, { useContext, useEffect, useState } from 'react';
// import axios from 'axios';
// import { AppContext } from '../context/AppContext';

// const TechnicianBookings = () => {
//   const { backendUrl, userData } = useContext(AppContext);
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchAccepted = async () => {
//       try {
//         const { data } = await axios.get(`${backendUrl}/api/bookings/technician/accepted`, { withCredentials: true });
//         if (data.success && Array.isArray(data.bookings)) {
//           setBookings(data.bookings);
//         }
//       } catch (e) {
//         // silent
//       } finally {
//         setLoading(false);
//       }
//     };
//     if (userData?.role === 'technician') fetchAccepted();
//   }, [backendUrl, userData?.role]);

//   if (userData?.role !== 'technician') {
//     return <div className='p-6 text-center text-red-600'>Technician access required.</div>;
//   }

//   return (
//     <div className='max-w-4xl mx-auto p-6 space-y-6'>
//       <div className='flex justify-between items-center'>
//         <h1 className='text-2xl font-bold'>My Accepted Bookings</h1>
//       </div>

//       <div className='bg-white shadow rounded p-4'>
//         {loading ? (
//           <p className='text-gray-600'>Loading bookings...</p>
//         ) : bookings.length === 0 ? (
//           <p className='text-gray-600'>No accepted bookings yet.</p>
//         ) : (
//           <ul className='space-y-4'>
//             {bookings.map((b) => (
//               <li key={b._id} className='border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'>
//                 <div className='flex gap-4 mb-3'>
//                   {b.SubCategoryID?.image && (
//                     <img src={`${backendUrl}${b.SubCategoryID.image}`} alt={b.SubCategoryID.name} className='w-20 h-20 rounded-lg object-cover' />
//                   )}
//                   <div className='flex-1'>
//                     <p className='font-semibold text-lg'>{b.SubCategoryID?.name || 'Service'}</p>
//                     <p className='text-sm text-gray-600'>Booking #{String(b._id).slice(-6)}</p>
//                     <p className='text-sm text-gray-600'>Date: {new Date(b.Date).toLocaleDateString()} | Time: {b.TimeSlot}</p>
//                     <p className='text-sm text-green-700 font-medium'>Status: {b.Status}</p>
//                     {b.SubCategoryID?.coinsRequired !== undefined && (
//                       <div className='flex items-center gap-2 mt-1'>
//                         <div className='flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full'>
//                           <span className='text-xs font-bold text-yellow-900'>C</span>
//                         </div>
//                         <span className='text-sm font-semibold text-gray-700'>Coins Used: {b.SubCategoryID.coinsRequired}</span>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 {b.CustomerID && (
//                   <div className='bg-gray-50 rounded-lg p-3'>
//                     <p className='text-sm font-medium text-gray-700'>Customer: {b.CustomerID.FirstName} {b.CustomerID.LastName}</p>
//                     {b.CustomerID.Address && (
//                       <p className='text-sm text-gray-600'>
//                         Address: {b.CustomerID.Address.houseNumber || b.CustomerID.Address.house_no}, {b.CustomerID.Address.street || b.CustomerID.Address.road}, {b.CustomerID.Address.city || b.CustomerID.Address.town}, {b.CustomerID.Address.pincode || b.CustomerID.Address.postcode}
//                       </p>
//                     )}
//                     {b.CustomerID.Phone && (
//                       <p className='text-sm text-gray-600'>Phone: {b.CustomerID.Phone}</p>
//                     )}
//                   </div>
//                 )}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// };

// export default TechnicianBookings;
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import ArrivalOTPModal from '../components/ArrivalOTPModal';

const TechnicianBookings = () => {
  const { backendUrl, userData } = useContext(AppContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingOTP, setGeneratingOTP] = useState(null); // Track by booking ID instead of boolean
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);
  const [completingService, setCompletingService] = useState(null); // Track completing by booking ID

  // ⭐ PAGINATION
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(bookings.length / pageSize) || 1;
  const paginated = bookings.slice((page - 1) * pageSize, page * pageSize);

  // ⭐ SAME Pagination Component as Admin & Customer Pages
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

        {/* Prev Button */}
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
            page === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 shadow-sm"
          }`}
        >
          Previous
        </button>

        {/* Dynamic Page Buttons */}
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

        {/* Next Button */}
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

  // Fetch Technician Accepted Bookings
  const fetchAccepted = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/bookings/technician/accepted`,
        { withCredentials: true }
      );
      if (data.success && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role === 'technician') fetchAccepted();
  }, [backendUrl, userData?.role]);

  // Handle "Arrived" button click
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
    fetchAccepted(); // Refresh bookings list
  };

  // Handle OTP modal close
  const handleOTPClose = () => {
    setSelectedBookingForOTP(null);
  };

  // Handle Service Done button click (generate completion OTP then open modal)
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

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>My Accepted Bookings</h1>
      </div>

      <div className='bg-white shadow rounded p-4'>
        {loading ? (
          <p className='text-gray-600'>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className='text-gray-600'>No accepted bookings yet.</p>
        ) : (
          <>
            <ul className='space-y-4'>
              {paginated.map((b) => (
                <li
                  key={b._id}
                  className='border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow'
                >
                  <div className='flex gap-4 mb-3'>
                    {b.SubCategoryID?.image && (
                      <img
                        src={`${backendUrl}${b.SubCategoryID.image}`}
                        alt={b.SubCategoryID.name}
                        className='w-20 h-20 rounded-lg object-cover'
                      />
                    )}

                    <div className='flex-1'>
                      <p className='font-semibold text-lg'>
                        {b.SubCategoryID?.name || 'Service'}
                      </p>
                      <p className='text-sm text-gray-600'>
                        Booking #{String(b._id).slice(-6)}
                      </p>
                      <p className='text-sm text-gray-600'>
                        Date: {new Date(b.Date).toLocaleDateString()} | Time: {b.TimeSlot}
                      </p>
                      <p className='text-sm text-green-700 font-medium'>
                        Status: {b.Status}
                      </p>

                      {b.SubCategoryID?.coinsRequired !== undefined && (
                        <div className='flex items-center gap-2 mt-1'>
                          <div className='flex items-center justify-center w-5 h-5 bg-yellow-300 rounded-full'>
                            <span className='text-xs font-bold text-yellow-900'>C</span>
                          </div>
                          <span className='text-sm font-semibold text-gray-700'>
                            Coins Used: {b.SubCategoryID.coinsRequired}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {b.CustomerID && (
                    <div className='bg-gray-50 rounded-lg p-3 mb-3'>
                      <p className='text-sm font-medium text-gray-700'>
                        Customer: {b.CustomerID.Name || `${b.CustomerID.FirstName} ${b.CustomerID.LastName}`}
                      </p>

                      {b.CustomerID.Address && (
                        <p className='text-sm text-gray-600'>
                          Address:{' '}
                          {b.CustomerID.Address.houseNumber || b.CustomerID.Address.house_no},{' '}
                          {b.CustomerID.Address.street || b.CustomerID.Address.road},{' '}
                          {b.CustomerID.Address.city || b.CustomerID.Address.town},{' '}
                          {b.CustomerID.Address.pincode || b.CustomerID.Address.postcode}
                        </p>
                      )}

                      {(b.CustomerID.Mobile || b.CustomerID.Phone) && (
                        <p className='text-sm text-gray-600'>
                          Phone: {b.CustomerID.Mobile || b.CustomerID.Phone}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Arrived Button */}
                  {b.Status === 'Confirmed' && !b.arrivalVerified && (
                    <button
                      onClick={() => handleArrived(b._id)}
                      disabled={generatingOTP === b._id}
                      className='w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition'
                    >
                      {generatingOTP === b._id ? 'Generating OTP...' : 'Arrived'}
                    </button>
                  )}

                  {b.Status === 'In-Progress' && b.arrivalVerified && (
                    <button
                      onClick={() => handleServiceDone(b._id)}
                      disabled={completingService === b._id}
                      className='w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition'
                    >
                      {completingService === b._id ? 'Sending OTP…' : 'Service Done'}
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* ⭐ Pagination Section */}
            {bookings.length > pageSize && (
              <div className="px-6 py-4 border-t bg-gray-50 border-gray-200/50 mt-4 shadow-sm">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* OTP Modal */}
      {selectedBookingForOTP && (
        <ArrivalOTPModal
          bookingId={selectedBookingForOTP}
          backendUrl={backendUrl}
          onClose={handleOTPClose}
          onSuccess={handleOTPSuccess}
          mode={bookings.find(b => b._id === selectedBookingForOTP)?.Status === 'In-Progress' ? 'completion' : 'arrival'}
        />
      )}
    </div>
  );
};

export default TechnicianBookings;
