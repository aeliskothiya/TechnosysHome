import mongoose from 'mongoose';

const FailedPaymentOperationSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPayment',
    required: true
  },
  errorMessage: {
    type: String,
    required: true
  },
  failedStep: {
    type: String,
    enum: ['payment', 'invoice', 'email', 'unknown'],
    default: 'unknown'
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'retrying', 'success', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying of pending retries
FailedPaymentOperationSchema.index({ status: 1, retryCount: 1 });

const FailedPaymentOperation = mongoose.model('FailedPaymentOperation', FailedPaymentOperationSchema);

export default FailedPaymentOperation;
