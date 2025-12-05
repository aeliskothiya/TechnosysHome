import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const FeedbackModal = ({ bookingId, backendUrl, onClose, onSuccess, existingFeedback }) => {
  const [rating, setRating] = useState(existingFeedback?.Rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState(existingFeedback?.FeedbackText || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.Rating);
      setFeedbackText(existingFeedback.FeedbackText || '');
    }
  }, [existingFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/feedback/submit`,
        {
          bookingId,
          rating,
          feedbackText: feedbackText.trim(),
        },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        onSuccess(data.feedback);
        onClose();
      } else {
        toast.error(data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
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
            <h2 className='text-2xl font-bold text-gray-900'>
              {existingFeedback ? 'Edit Feedback' : 'Give Feedback'}
            </h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 transition-colors'
              disabled={submitting}
            >
              <X className='h-6 w-6' />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Rating */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-3'>
                Rating *
              </label>
              <div className='flex items-center justify-center space-x-2'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type='button'
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className='transition-transform hover:scale-110'
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className='text-center text-sm text-gray-600 mt-2'>
                {rating === 0
                  ? 'Select your rating'
                  : `You rated ${rating} star${rating > 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Feedback Text */}
            <div className='mb-6'>
              <label
                htmlFor='feedbackText'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Your Feedback (Optional)
              </label>
              <textarea
                id='feedbackText'
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder='Share your experience with this service...'
                rows={5}
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all resize-none'
                disabled={submitting}
              />
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
                disabled={submitting || rating === 0}
                className='px-6 py-3 text-sm font-medium text-white rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg'
              >
                {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
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

export default FeedbackModal;
