import CustomerPayment from '../models/CustomerPayment.js';
import Customer from '../models/Customer.js';
import Booking from '../models/Booking.js';
import SubServiceCategory from '../models/SubServiceCategory.js';
import { verifyRazorpayAndFinalize } from '../services/payment.service.js';
import { generateInvoice } from '../services/invoice.service.js';
import transporter from '../config/nodemailer.js';

const SENDER_NAME = process.env.SENDER_NAME || "Technosys";
const SENDER_EMAIL = process.env.SENDER_EMAIL || process.env.SMTP_USER || "no-reply@technosys.local";
const REPLY_TO = process.env.REPLY_TO || SENDER_EMAIL;

/**
 * Create payment order BEFORE booking (payment-first flow)
 */
export async function createPaymentOrder(req, res) {
  try {
    const { SubCategoryID, Date, TimeSlot } = req.body;
    const customerId = req.userId || req.user?._id;

    if (!SubCategoryID) {
      return res.status(400).json({ success: false, message: 'SubCategoryID is required' });
    }

    // Get customer details
    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Get subcategory price
    const subcategory = await SubServiceCategory.findById(SubCategoryID).lean();
    if (!subcategory) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const amount = subcategory.price || 0;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid service price' });
    }

    const { createRazorpayOrder } = await import('../services/payment.service.js');

    // Create payment record WITHOUT booking reference (will be added later)
    const paymentRecord = await CustomerPayment.create({
      CustomerID: customerId,
      Amount: amount,
      Method: 'Other',
      Status: 'Pending',
    });

    // Create Razorpay order with authorization only (payment_capture: 0)
    const razorpayOrder = await createRazorpayOrder({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `payment_${paymentRecord._id}`,
      payment_capture: 0, // Block money without capturing
    });

    // Update payment record with Razorpay order ID
    paymentRecord.RazorpayOrderID = razorpayOrder.id;
    await paymentRecord.save();

    res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: amount,
        paymentId: paymentRecord._id,
      },
    });
  } catch (err) {
    console.error('createPaymentOrder error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Verify payment authorization (money blocked, not charged yet)
 */
export async function verifyPaymentAuthorization(req, res) {
  try {
    const { paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const { success, paymentRecord } = await verifyRazorpayAndFinalize({
      paymentModel: CustomerPayment,
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!success) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update payment status to Authorized (money blocked, not captured)
    paymentRecord.Status = 'Authorized';
    paymentRecord.RazorpayPaymentID = razorpay_payment_id;
    paymentRecord.RazorpaySignature = razorpay_signature;
    await paymentRecord.save();

    // Send authorization email (booking may not exist yet in new flow)
    const booking = paymentRecord.BookingID 
      ? await Booking.findById(paymentRecord.BookingID)
          .populate('SubCategoryID', 'name')
          .populate('CustomerID', 'FirstName LastName Email')
      : null;

    // Get customer info directly if booking doesn't exist
    const customer = booking?.CustomerID || await Customer.findById(paymentRecord.CustomerID);

    if (customer?.Email) {
      const customerName = `${customer.FirstName || ''} ${customer.LastName || ''}`.trim() || 'Valued Customer';
      const serviceName = booking?.SubCategoryID?.name || 'Service';
      const amount = paymentRecord.Amount;

      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: customer.Email,
        subject: 'Payment Authorized - Technosys',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Authorized</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">✓ PAYMENT AUTHORIZED</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Payment Secured</h1>
                        <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Your booking request is being processed</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
                        <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">We have successfully authorized your payment for the ${serviceName} booking. The amount has been securely blocked in your account and will only be charged once a technician accepts your booking and completes the service.</p>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; margin: 30px 0;">
                          <tr>
                            <td style="padding: 25px;">
                              <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Details</p>
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service:</td>
                                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Blocked:</td>
                                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">₹${amount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment ID:</td>
                                  <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${razorpay_payment_id}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                                  <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: 700; text-align: right;">AUTHORIZED</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #3b82f6; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">i</span>What's Next?</p>
                              <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Your booking request will be sent to nearby technicians. Once a technician accepts your booking and completes the service, the blocked amount will be charged. If no technician accepts within 10 minutes, the booking will be auto-cancelled and the blocked amount will be released back to your account.</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">You will receive updates via email and in-app notifications about your booking status.</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    res.json({
      success: true,
      message: 'Payment authorized successfully',
      data: { payment: paymentRecord },
    });
  } catch (err) {
    console.error('verifyPaymentAuthorization error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
}

/**
 * Capture payment when technician accepts (actually charge the money)
 * This will be called when technician accepts the booking
 */
export async function capturePaymentOnAcceptance(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('PaymentID')
      .populate('SubCategoryID', 'name')
      .populate('CustomerID', 'FirstName LastName Email')
      .populate('TechnicianID', 'Name Email');

    if (!booking || !booking.PaymentID) {
      console.error('capturePaymentOnAcceptance: Booking or Payment not found');
      return;
    }

    const payment = booking.PaymentID;

    if (payment.Status !== 'Authorized') {
      console.error('capturePaymentOnAcceptance: Payment not in Authorized state');
      return;
    }

    // Update payment status to Captured
    payment.Status = 'Captured';
    await payment.save();

    // Generate invoice
    const invoiceDoc = await generateInvoice({
      refType: 'CustomerPayment',
      refId: payment._id,
      paymentRecord: payment,
      subscriptionPackage: {
        name: booking.SubCategoryID?.name || 'Service Booking',
        price: payment.Amount,
        coins: 1, // Quantity
      },
      recipient: {
        Name: `${booking.CustomerID?.FirstName || ''} ${booking.CustomerID?.LastName || ''}`.trim(),
        Email: booking.CustomerID?.Email,
        MobileNumber: booking.CustomerID?.MobileNumber,
      },
    });

    // Send capture confirmation email with invoice
    if (booking.CustomerID?.Email) {
      const customerName = `${booking.CustomerID.FirstName || ''} ${booking.CustomerID.LastName || ''}`.trim() || 'Valued Customer';
      const serviceName = booking.SubCategoryID?.name || 'Service';
      const technicianName = booking.TechnicianID?.Name || 'Technician';

      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: booking.CustomerID.Email,
        subject: 'Payment Charged - Booking Confirmed - Technosys',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Charged</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">✓ PAYMENT CHARGED</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Booking Confirmed!</h1>
                        <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">Your technician is on the way</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
                        <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Great news! ${technicianName} has accepted your ${serviceName} booking. Your payment has been successfully charged, and your service is confirmed.</p>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin: 30px 0;">
                          <tr>
                            <td style="padding: 25px;">
                              <p style="margin: 0 0 12px; color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Confirmed</p>
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Service:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Amount Charged:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">₹${payment.Amount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Technician:</td>
                                  <td style="padding: 8px 0; color: #14532d; font-size: 14px; font-weight: 600; text-align: right;">${technicianName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #15803d; font-size: 14px;">Status:</td>
                                  <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 700; text-align: right;">CHARGED</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">Your invoice is attached to this email. The technician will arrive at the scheduled time. Please keep the arrival OTP ready to verify their arrival.</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    console.log(`✓ Payment captured for booking ${bookingId}`);
  } catch (err) {
    console.error('capturePaymentOnAcceptance error:', err);
  }
}

/**
 * Refund payment when booking is cancelled
 */
export async function refundPaymentOnCancellation(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('PaymentID')
      .populate('SubCategoryID', 'name')
      .populate('CustomerID', 'FirstName LastName Email');

    if (!booking || !booking.PaymentID) {
      console.error('refundPaymentOnCancellation: Booking or Payment not found');
      return;
    }

    const payment = booking.PaymentID;

    if (payment.Status === 'Refunded') {
      console.log('refundPaymentOnCancellation: Payment already refunded');
      return;
    }

    // Update payment status to Refunded
    payment.Status = 'Refunded';
    await payment.save();

    // Send refund email
    if (booking.CustomerID?.Email) {
      const customerName = `${booking.CustomerID.FirstName || ''} ${booking.CustomerID.LastName || ''}`.trim() || 'Valued Customer';
      const serviceName = booking.SubCategoryID?.name || 'Service';

      await transporter.sendMail({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        replyTo: REPLY_TO,
        to: booking.CustomerID.Email,
        subject: 'Refund Initiated - Technosys',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Refund Initiated</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px 16px 0 0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center;">
                        <div style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
                          <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 1px;">↺ REFUND INITIATED</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Refund Processing</h1>
                        <p style="margin: 10px 0 0; color: #dbeafe; font-size: 16px;">Your money will be returned soon</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Dear ${customerName},</p>
                        <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">Your booking for ${serviceName} has been cancelled, and a refund has been initiated. The blocked amount will be released back to your original payment method.</p>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe; margin: 30px 0;">
                          <tr>
                            <td style="padding: 25px;">
                              <p style="margin: 0 0 12px; color: #1e40af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Refund Details</p>
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #1e40af; font-size: 14px;">Service:</td>
                                  <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${serviceName}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #1e40af; font-size: 14px;">Refund Amount:</td>
                                  <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">₹${payment.Amount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #1e40af; font-size: 14px;">Status:</td>
                                  <td style="padding: 8px 0; color: #3b82f6; font-size: 14px; font-weight: 700; text-align: right;">PROCESSING</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 25px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 700;"><span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background-color: #f59e0b; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: 900; margin-right: 8px;">⏱</span>Processing Time</p>
                              <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">Your refund will be processed within 5-7 business days. You will receive a confirmation email once the refund is completed.</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 25px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">We apologize for any inconvenience. If you have any questions about your refund, please contact our support team.</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">© ${new Date().getFullYear()} Technosys. All rights reserved.</p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">Quality home services at your doorstep</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    console.log(`✓ Payment refunded for booking ${bookingId}`);
  } catch (err) {
    console.error('refundPaymentOnCancellation error:', err);
  }
}

export default {
  createPaymentOrder,
  verifyPaymentAuthorization,
  capturePaymentOnAcceptance,
  refundPaymentOnCancellation,
};
