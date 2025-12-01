import { Request, Response } from 'express';
import { PaymentIntent, PaymentHistory, CallbackLog, Tenant, Property, ActivityLog, TenantActivityLog, Landlord } from '../database';
import { RESULT_CODES } from '../utils/darajaService';
import { sendPaymentReceivedEmail } from '../services/emailService';
import { format } from 'date-fns';

/**
 * Handle M-Pesa STK Push callback
 * This endpoint receives payment results from Daraja API
 * 
 * Callback Structure:
 * {
 *   Body: {
 *     stkCallback: {
 *       MerchantRequestID: "29115-34620561-1",
 *       CheckoutRequestID: "ws_CO_191220191020363925",
 *       ResultCode: 0,
 *       ResultDesc: "The service request is processed successfully.",
 *       CallbackMetadata: {
 *         Item: [
 *           { Name: "Amount", Value: 1.00 },
 *           { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
 *           { Name: "TransactionDate", Value: 20191219102115 },
 *           { Name: "PhoneNumber", Value: 254708374149 }
 *         ]
 *       }
 *     }
 *   }
 * }
 */
export async function handleSTKCallback(req: Request, res: Response) {
  try {
    console.log('\n🔔 Received M-Pesa callback');
    console.log('Full body:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    
    if (!Body?.stkCallback) {
      console.log('❌ Invalid callback format - missing stkCallback');
      return res.status(400).json({ error: 'Invalid callback format' });
    }

    const callback = Body.stkCallback;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = callback;

    // Log the callback for audit trail
    const timeoutLog = await CallbackLog.create({
      merchantRequestID: callback.MerchantRequestID || 'timeout',
      checkoutRequestID: CheckoutRequestID,
      resultCode: ResultCode || Number(RESULT_CODES.TIMEOUT),
      resultDesc: ResultDesc || 'Request timeout',
      rawPayload: req.body
    });

    console.log('📝 Callback logged');
    console.log('  Checkout Request ID:', CheckoutRequestID);
    console.log('  Result Code:', ResultCode);
    console.log('  Result Description:', ResultDesc);

    // Find the payment intent
    const paymentIntent = await PaymentIntent.findOne({
      checkoutRequestID: CheckoutRequestID
    });

    if (!paymentIntent) {
      console.log('⚠️  Payment intent not found for:', CheckoutRequestID);
      // Still return 200 to acknowledge receipt
      return res.status(200).json({ 
        ResultCode: 0, 
        ResultDesc: 'Accepted' 
      });
    }

    console.log('✅ Payment intent found');
    console.log('  Payment Intent ID:', paymentIntent._id);
    console.log('  Amount:', paymentIntent.amount);
    console.log('  Tenant ID:', paymentIntent.tenantId);

    // Update payment intent based on result code
    if (ResultCode === RESULT_CODES.SUCCESS) {
      // Payment successful
      console.log('✅ Payment successful!');

      // Extract payment details from callback metadata
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
      const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value;
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

      console.log('💳 Payment details:');
      console.log('  Receipt Number:', mpesaReceiptNumber);
      console.log('  Amount:', amount);
      console.log('  Phone:', phoneNumber);
      console.log('  Date:', transactionDate);

      // Update payment intent
      paymentIntent.status = 'success';
      paymentIntent.transactionId = mpesaReceiptNumber;
      paymentIntent.resultCode = ResultCode;
      paymentIntent.resultDesc = ResultDesc;
      paymentIntent.completedAt = new Date();
      paymentIntent.callbackReceived = true;
      paymentIntent.callbackData = callback;
      await paymentIntent.save();

      console.log('✅ Payment intent updated to completed');

      // Create or update payment history
      try {
        let paymentHistory: any;
        
        if (paymentIntent.billId) {
          // Update existing payment history
          paymentHistory = await PaymentHistory.findById(paymentIntent.billId);
          
          if (paymentHistory) {
            console.log('📄 Updating existing payment history:', paymentHistory._id);
            paymentHistory.status = 'completed';
            paymentHistory.paymentMethod = 'mpesa';
            paymentHistory.notes = `M-Pesa payment: ${mpesaReceiptNumber}`;
            await paymentHistory.save();
          }
        } else {
          // Create new payment history record
          console.log('📄 Creating new payment history record');
          
          // Get tenant and property details
          const tenant = await Tenant.findById(paymentIntent.tenantId);
          const property = await Property.findById(tenant?.propertyId);
          
          if (!tenant || !property) {
            console.log('⚠️  Cannot create payment history: tenant or property not found');
          } else {
            const paymentDate = transactionDate 
              ? new Date(
                  parseInt(transactionDate.substring(0, 4)),  // Year
                  parseInt(transactionDate.substring(4, 6)) - 1,  // Month (0-indexed)
                  parseInt(transactionDate.substring(6, 8)),  // Day
                  parseInt(transactionDate.substring(8, 10)),  // Hour
                  parseInt(transactionDate.substring(10, 12)),  // Minute
                  parseInt(transactionDate.substring(12, 14))  // Second
                )
              : new Date();
            
            const now = new Date();
            
            // Get base rent from property type
            const propertyType = tenant.apartmentInfo?.propertyType;
            const propertyTypeInfo = property.propertyTypes?.find((pt: any) => pt.type === propertyType);
            const monthlyRent = propertyTypeInfo ? parseFloat(propertyTypeInfo.price) : paymentIntent.amount;
            
            // Calculate utilities
            const utilityCharges = property.utilities?.map((utility: any) => ({
              type: utility.type,
              unitsUsed: 1,
              pricePerUnit: parseFloat(utility.price),
              total: parseFloat(utility.price),
            })) || [];
            const totalUtilityCost = utilityCharges.reduce((sum: number, charge: any) => sum + charge.total, 0);
            
            paymentHistory = await PaymentHistory.create({
              tenantId: paymentIntent.tenantId,
              landlordId: paymentIntent.landlordId,
              propertyId: property._id,
              amount: paymentIntent.amount,
              paymentDate,
              forMonth: now.getMonth() + 1, // Current month (1-12)
              forYear: now.getFullYear(),
              monthlyRent, // Base rent from property type
              paymentMethod: 'mpesa',
              status: 'completed',
              notes: `M-Pesa payment: ${mpesaReceiptNumber}`,
              utilityCharges,
              totalUtilityCost
            });
            
            console.log('✅ Payment history created:', paymentHistory._id);
          }
        }

        // Create activity logs for landlord and tenant
        if (paymentHistory) {
          console.log('📝 Creating activity logs');
          
          // Landlord activity
          await ActivityLog.create({
            landlordId: paymentIntent.landlordId,
            activityType: 'payment_received',
            title: 'Payment Received',
            description: `Received KES ${paymentIntent.amount.toLocaleString()} via M-Pesa`,
            metadata: {
              tenantId: paymentIntent.tenantId,
              propertyId: paymentHistory.propertyId,
              paymentId: paymentHistory._id,
              amount: paymentIntent.amount,
              mpesaReceiptNumber,
              transactionDate,
              phoneNumber
            },
            icon: 'dollar-sign',
            priority: 'medium'
          });
          
          // Tenant activity
          await TenantActivityLog.create({
            tenantId: paymentIntent.tenantId,
            activityType: 'payment_processed',
            title: 'Payment Successful',
            description: `Paid KES ${paymentIntent.amount.toLocaleString()} via M-Pesa`,
            metadata: {
              landlordId: paymentIntent.landlordId,
              propertyId: paymentHistory.propertyId,
              paymentId: paymentHistory._id,
              amount: paymentIntent.amount,
              mpesaReceiptNumber,
              transactionDate
            },
            icon: 'check-circle',
            priority: 'medium'
          });
          
          console.log('✅ Activity logs created');

          // ============================================
          // 📧 EMAIL NOTIFICATION
          // ============================================
          const landlord = await Landlord.findById(paymentIntent.landlordId);
          const tenant = await Tenant.findById(paymentIntent.tenantId);
          
          if (landlord?.emailSettings?.enabled && tenant) {
            try {
              await sendPaymentReceivedEmail({
                tenantName: tenant.fullName,
                tenantEmail: tenant.email,
                landlordName: landlord.fullName,
                amount: paymentIntent.amount,
                paymentDate: format(transactionDate, 'MMMM dd, yyyy'),
                paymentMethod: 'M-Pesa',
                receiptNumber: mpesaReceiptNumber,
                propertyName: tenant.apartmentInfo?.propertyName || 'Property',
                unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
                forPeriod: paymentHistory.forMonth && paymentHistory.forYear
                  ? `${new Date(paymentHistory.forYear, paymentHistory.forMonth - 1).toLocaleString('default', { month: 'long' })} ${paymentHistory.forYear}`
                  : 'N/A',
                landlordId: paymentIntent.landlordId.toString(),
                tenantId: paymentIntent.tenantId.toString()
              });
              console.log(`✅ Payment confirmation email sent to ${tenant.email}`);
            } catch (emailError) {
              console.error('⚠️ Failed to send payment confirmation email:', emailError);
              // Don't fail the callback if email fails
            }
          }
        }
      } catch (error: any) {
        console.error('⚠️  Error creating/updating payment history:', error.message);
        console.error(error);
        // Don't fail the whole callback if payment history creation fails
      }

    } else {
      // Payment failed or cancelled
      console.log('❌ Payment failed');
      console.log('  Result Code:', ResultCode);
      console.log('  Result Description:', ResultDesc);

      paymentIntent.status = 'failed';
      paymentIntent.resultCode = ResultCode;
      paymentIntent.resultDesc = ResultDesc;
      paymentIntent.completedAt = new Date();
      paymentIntent.callbackReceived = true;
      paymentIntent.callbackData = callback;
      await paymentIntent.save();

      console.log('✅ Payment intent updated to failed');

      // Create tenant activity log for failed payment
      try {
        const tenant = await Tenant.findById(paymentIntent.tenantId);
        if (tenant) {
          await TenantActivityLog.create({
            tenantId: paymentIntent.tenantId,
            activityType: 'payment_failed',
            title: 'Payment Failed',
            description: `Payment failed: ${ResultDesc}`,
            metadata: {
              landlordId: paymentIntent.landlordId,
              propertyId: tenant.propertyId,
              amount: paymentIntent.amount,
              resultCode: ResultCode,
              resultDesc: ResultDesc,
              phoneNumber: paymentIntent.phoneNumber
            },
            icon: 'x-circle',
            priority: 'high'
          });
          console.log('✅ Failure activity log created');
        }
      } catch (error: any) {
        console.error('⚠️  Error creating failure log:', error.message);
      }
    }

    // Acknowledge receipt to Daraja
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });

  } catch (error: any) {
    console.error('❌ Error handling callback:', error);
    
    // Log the error but still acknowledge receipt
    try {
      await CallbackLog.create({
        merchantRequestID: req.body?.Body?.stkCallback?.MerchantRequestID || 'unknown',
        checkoutRequestID: req.body?.Body?.stkCallback?.CheckoutRequestID || 'unknown',
        resultCode: -1,
        resultDesc: `Error processing callback: ${error.message}`,
        rawPayload: req.body
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }

    // Still return 200 to prevent Daraja from retrying
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
}

/**
 * Handle M-Pesa timeout callback
 * Called when customer doesn't respond to STK push within timeout period
 */
export async function handleSTKTimeout(req: Request, res: Response) {
  try {
    console.log('\n⏱️  Received M-Pesa timeout callback');
    console.log('Full body:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    
    if (!Body?.stkCallback) {
      console.log('❌ Invalid timeout format - missing stkCallback');
      return res.status(400).json({ error: 'Invalid callback format' });
    }

    const callback = Body.stkCallback;
    const { CheckoutRequestID, ResultCode, ResultDesc } = callback;

    // Log the timeout
    await CallbackLog.create({
      merchantRequestID: callback.MerchantRequestID || 'timeout',
      checkoutRequestID: CheckoutRequestID,
      resultCode: ResultCode || RESULT_CODES.TIMEOUT,
      resultDesc: ResultDesc || 'Request timeout',
      rawPayload: req.body
    });

    // Find and update payment intent
    const paymentIntent = await PaymentIntent.findOne({
      checkoutRequestID: CheckoutRequestID
    });

    if (paymentIntent) {
      console.log('⏱️  Marking payment as timeout');
      paymentIntent.status = 'timeout';
      paymentIntent.resultCode = Number(RESULT_CODES.TIMEOUT);
      paymentIntent.resultDesc = 'Payment request timed out';
      paymentIntent.completedAt = new Date();
      paymentIntent.callbackReceived = true;
      paymentIntent.callbackData = callback;
      await paymentIntent.save();

      console.log('✅ Payment intent updated to timeout');
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });

  } catch (error: any) {
    console.error('❌ Error handling timeout:', error);
    
    // Still acknowledge receipt
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
}
