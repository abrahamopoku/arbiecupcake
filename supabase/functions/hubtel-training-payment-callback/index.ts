
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Mask phone number for security
function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return '***' + phone.slice(-4);
}

// Log payment status update
async function logPaymentUpdate(
  transactionId: string,
  status: string,
  errorMessage?: string,
  hubtelResponse?: any
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/payment_logs?transaction_id=eq.${transactionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: status,
        error_message: errorMessage || null,
        hubtel_response: hubtelResponse || null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to update payment log:', error);
  }
}

// Get registration from payment log
async function getRegistrationFromPaymentLog(transactionId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/payment_logs?transaction_id=eq.${transactionId}&select=*&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payment log');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error('Payment log not found');
  }

  return data[0];
}

// Get registration details
async function getRegistrationDetails(registrationId: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/training_registrations?id=eq.${registrationId}&select=*&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch registration');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error('Registration not found');
  }

  return data[0];
}

// Mark checkout token as used
async function markTokenAsUsed(checkoutToken: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/checkout_tokens?checkout_token=eq.${checkoutToken}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      is_used: true,
      used_at: new Date().toISOString()
    })
  });
}

// Update registration with payment details
async function updateRegistrationPayment(
  registrationId: string,
  transactionId: string
) {
  await fetch(`${SUPABASE_URL}/rest/v1/training_registrations?id=eq.${registrationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      payment_status: 'Paid',
      payment_method: 'Hubtel Mobile Money',
      transaction_id: transactionId
    })
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callbackData = await req.json();
    console.log('Hubtel callback received:', JSON.stringify(callbackData, null, 2));

    // Extract data from Hubtel callback (flexible format handling)
    const data = callbackData.Data || callbackData.data || callbackData;
    const status = data.Status || data.status || callbackData.Status || callbackData.status;
    const responseCode = data.ResponseCode || data.responseCode || callbackData.ResponseCode;
    const transactionId = data.CheckoutId || data.checkoutId || data.ClientReference || data.clientReference;
    const amount = data.AmountCharged || data.amountCharged || data.Amount || data.amount;

    if (!transactionId) {
      throw new Error('No transaction ID found in callback');
    }

    console.log(`Payment callback - Transaction: ${transactionId}, Status: ${status}, Code: ${responseCode}`);

    // Get payment log to find registration
    const paymentLog = await getRegistrationFromPaymentLog(transactionId);
    const registration = await getRegistrationDetails(paymentLog.training_registration_id);

    // Determine payment status
    let paymentStatus = 'pending';
    let errorMessage = null;

    if (status === 'Success' || status === 'success' || responseCode === '0000') {
      paymentStatus = 'success';

      // Mark token as used
      if (registration.checkout_link) {
        const tokenMatch = registration.checkout_link.match(/token=([^&]+)/);
        if (tokenMatch) {
          await markTokenAsUsed(tokenMatch[1]);
        }
      }

      // Update registration
      await updateRegistrationPayment(registration.id, transactionId);

      // Send payment confirmation email
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-course-payment-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            studentEmail: registration.email,
            studentName: registration.full_name,
            courseName: registration.package_title,
            amount: registration.package_price,
            invoiceNumber: registration.invoice_number,
            transactionId: transactionId,
            paymentMethod: 'Hubtel Mobile Money',
            training_mode: registration.training_mode
          })
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

    } else if (status === 'Failed' || status === 'failed') {
      paymentStatus = 'failed';
      errorMessage = data.Message || data.message || 'Payment failed';
    } else if (status === 'Cancelled' || status === 'cancelled') {
      paymentStatus = 'cancelled';
      errorMessage = 'Payment cancelled by user';
    }

    // Update payment log
    await logPaymentUpdate(transactionId, paymentStatus, errorMessage, callbackData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        status: paymentStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Callback processing error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
