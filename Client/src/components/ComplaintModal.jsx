import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ComplaintModal = ({ bookingId, backendUrl, onClose, onSuccess, existingComplaint }) => {
  const [complaintText, setComplaintText] = useState(existingComplaint?.ComplaintText || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingComplaint) {
      setComplaintText(existingComplaint.ComplaintText || '');
    }
  }, [existingComplaint]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!complaintText.trim()) {
      toast.error('Please enter your complaint');
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/complaints/submit`,
        {
          bookingId,
          complaintText: complaintText.trim(),
        },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        onSuccess(data.complaint);
        onClose();
      } else {
        toast.error(data.message || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error(error.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-6'>
          {/* Header */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center space-x-3'>
              <div className='p-2 bg-red-100 rounded-lg'>
                <AlertCircle className='h-6 w-6 text-red-600' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900'>
                {existingComplaint ? 'Edit Complaint' : 'File Complaint'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 transition-colors'
              disabled={submitting}
            >
              <X className='h-6 w-6' />
            </button>
          </div>

          {existingComplaint && existingComplaint.Status && (
            <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <p className='text-sm text-yellow-800'>
                <span className='font-semibold'>Status:</span> {existingComplaint.Status}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Complaint Text */}
            <div className='mb-6'>
              <label
                htmlFor='complaintText'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Describe Your Complaint *
              </label>
              <textarea
                id='complaintText'
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder='Please describe the issue you faced with this service...'
                rows={6}
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/50 backdrop-blur-sm transition-all resize-none'
                disabled={submitting}
                required
              />
              <p className='text-xs text-gray-500 mt-2'>
                Please provide as much detail as possible to help us resolve your issue.
              </p>
            </div>

            {/* Buttons */}
            <div className='flex justify-end space-x-3'>
              <button
                type='button'
                onClick={onClose}
                disabled={submitting}
                className='px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={submitting || !complaintText.trim()}
                className='px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg'
              >
                {submitting ? 'Submitting...' : existingComplaint ? 'Update Complaint' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
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
};

export default ComplaintModal;
