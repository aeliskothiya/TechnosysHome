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
