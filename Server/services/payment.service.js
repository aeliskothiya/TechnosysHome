import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function createRazorpayOrder({ amount, currency = 'INR', receipt, payment_capture = 1 }) {
  const orderOptions = { amount, currency, receipt, payment_capture };
  return await razorpayInstance.orders.create(orderOptions);
}

/**
 * Verify Razorpay signature and finalize payment record.
 * - paymentModel: a Mongoose model (e.g., SubscriptionPayment)
 * - paymentId: id of payment record
 * - razorpay_order_id, razorpay_payment_id, razorpay_signature: provider payload
 * - secret: optional override for key secret
 * - onSuccess: async callback(paymentRecord) executed after marking success
 * Returns { success: boolean, paymentRecord }
 */
export async function verifyRazorpayAndFinalize({ paymentModel, paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature, secret = process.env.RAZORPAY_KEY_SECRET, onSuccess = null }) {
  // compute signature
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const paymentRecord = await paymentModel.findById(paymentId);
  if (!paymentRecord) {
    throw new Error('Payment record not found');
  }

  if (generated_signature !== razorpay_signature) {
    paymentRecord.Status = 'Failed';
    paymentRecord.ProviderPaymentId = razorpay_payment_id;
    paymentRecord.ProviderSignature = razorpay_signature;
    await paymentRecord.save();

    return { success: false, paymentRecord };
  }

  // mark success
  paymentRecord.Status = 'Success';
  paymentRecord.ProviderPaymentId = razorpay_payment_id;
  paymentRecord.ProviderSignature = razorpay_signature;
  await paymentRecord.save();

  // call post-success hook if provided
  if (onSuccess && typeof onSuccess === 'function') {
    await onSuccess(paymentRecord);
  }

  return { success: true, paymentRecord };
}

/**
 * Capture a previously authorized payment (one-step payment_capture: 0)
 * This actually charges the customer's card
 */
export async function captureRazorpayPayment(razorpay_payment_id, amount) {
  try {
    const captureResponse = await razorpayInstance.payments.capture(razorpay_payment_id, amount);
    return { success: true, data: captureResponse };
  } catch (err) {
    console.error('Failed to capture Razorpay payment:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Refund a payment (full or partial)
 * Can be used after capture or on authorized payments
 */
export async function refundRazorpayPayment(razorpay_payment_id, amount = null) {
  try {
    const refundOptions = {};
    if (amount) {
      refundOptions.amount = amount; // Partial refund (in paise)
    }
    const refundResponse = await razorpayInstance.payments.refund(razorpay_payment_id, refundOptions);
    return { success: true, data: refundResponse };
  } catch (err) {
    console.error('Failed to refund Razorpay payment:', err);
    return { success: false, error: err.message };
  }
}
