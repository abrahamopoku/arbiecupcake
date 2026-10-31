
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface PaymentRequest {
  amount: number;
  invoice_number: string;
  phone_number: string;
  student_email: string;
  student_name: string;
  course_name: string;
  checkout_token: string;
  training_registration_id: string;
}

interface HubtelSettings {
  client_id: string;
  client_secret: string;
  pos_sales_id: string;
  is_active: boolean;
}

// Fetch Hubtel settings from database
async function fetchHubtelSettings(): Promise<HubtelSettings> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/hubtel_settings?is_active=eq.true&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Hubtel settings from database');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error('No active Hubtel configuration found');
  }

  return data[0];
}

// Validate checkout token
async function validateCheckoutToken(token: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/checkout_tokens?checkout_token=eq.${token}&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to validate checkout token');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    return { valid: false, error: 'Invalid checkout token' };
  }

  const tokenData = data[0];

  // Check if already used
  if (tokenData.is_used) {
    return { valid: false, error: 'Checkout token has already been used' };
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  if (now > expiresAt) {
    return { valid: false, error: 'Checkout token has expired' };
  }

  return { valid: true, data: tokenData };
}

// Format phone number for Hubtel (233XXXXXXXXX)
function formatHubtelPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '233' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  
  return cleaned;
}

// Mask phone number for security (show last 4 digits)
function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return '***' + phone.slice(-4);
}

// Log payment attempt
async function logPaymentAttempt(
  registrationId: string,
  tokenId: string,
  paymentMethod: string,
  amount: number,
  phoneNumber: string,
  status: string,
  errorMessage?: string,
  hubtelResponse?: any,
  transactionId?: string
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/payment_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        training_registration_id: registrationId,
        checkout_token_id: tokenId,
        payment_method: paymentMethod,
        amount: amount,
        phone_number: maskPhoneNumber(phoneNumber),
        transaction_id: transactionId || null,
        status: status,
        error_message: errorMessage || null,
        hubtel_response: hubtelResponse || null,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: 'Supabase Edge Function'
        }
      })
    });
  } catch (error) {
    console.error('Failed to log payment attempt:', error);
  }
}

// Process Hubtel payment
async function processHubtelPayment(
  settings: HubtelSettings,
  paymentData: PaymentRequest
): Promise<any> {
  const formattedPhone = formatHubtelPhone(paymentData.phone_number);
  
  // Validate phone format
  if (!/^233\d{9}$/.test(formattedPhone)) {
    throw new Error('Invalid phone number format. Must be a valid Ghanaian number.');
  }

  const clientReference = `TRN-${paymentData.invoice_number}-${Date.now()}`;
  const callbackUrl = `${SUPABASE_URL}/functions/v1/hubtel-training-payment-callback`;
  
  const hubtelPayload = {
    clientReference: clientReference,
    description: `Training Course Payment - ${paymentData.course_name} - Invoice #${paymentData.invoice_number}`,
    totalAmount: paymentData.amount,
    callbackUrl: callbackUrl,
    returnUrl: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/training`,
    cancellationUrl: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/course-checkout?token=${paymentData.checkout_token}`,
    merchantAccountNumber: settings.pos_sales_id,
    primaryCallbackUrl: callbackUrl
  };

  console.log('Hubtel payment request:', JSON.stringify(hubtelPayload, null, 2));

  // Call Hubtel API
  const authString = btoa(`${settings.client_id}:${settings.client_secret}`);
  
  const hubtelResponse = await fetch('https://api.hubtel.com/v1/merchantaccount/onlinecheckout/initiate', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(hubtelPayload)
  });

  const responseData = await hubtelResponse.json();
  console.log('Hubtel API response:', JSON.stringify(responseData, null, 2));

  if (!hubtelResponse.ok) {
    throw new Error(responseData.message || responseData.Message || 'Hubtel payment initiation failed');
  }

  // Extract response data (handle different Hubtel response formats)
  const data = responseData.data || responseData.Data || responseData;
  const checkoutId = data.checkoutId || data.CheckoutId || data.clientReference || clientReference;
  const checkoutUrl = data.checkoutDirectUrl || data.CheckoutDirectUrl || data.checkoutUrl;

  return {
    success: true,
    transactionId: checkoutId,
    checkoutUrl: checkoutUrl,
    clientReference: clientReference,
    hubtelResponse: responseData
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: PaymentRequest = await req.json();

    console.log('Payment request received:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.amount || !payload.invoice_number || !payload.phone_number || 
        !payload.student_email || !payload.student_name || !payload.course_name || 
        !payload.checkout_token || !payload.training_registration_id) {
      throw new Error('Missing required payment fields');
    }

    // Validate checkout token
    const tokenValidation = await validateCheckoutToken(payload.checkout_token);
    if (!tokenValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tokenValidation.error
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const tokenData = tokenValidation.data;

    // Verify amount matches
    if (Math.abs(tokenData.amount - payload.amount) > 0.01) {
      throw new Error('Payment amount does not match registration amount');
    }

    // Fetch Hubtel settings
    const hubtelSettings = await fetchHubtelSettings();

    if (!hubtelSettings.is_active) {
      throw new Error('Hubtel payments are currently disabled');
    }

    // Log payment attempt as pending
    await logPaymentAttempt(
      payload.training_registration_id,
      tokenData.id,
      'Hubtel Mobile Money',
      payload.amount,
      payload.phone_number,
      'pending'
    );

    // Process Hubtel payment
    const paymentResult = await processHubtelPayment(hubtelSettings, payload);

    // Log successful initiation
    await logPaymentAttempt(
      payload.training_registration_id,
      tokenData.id,
      'Hubtel Mobile Money',
      payload.amount,
      payload.phone_number,
      'pending',
      null,
      paymentResult.hubtelResponse,
      paymentResult.transactionId
    );

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentResult.transactionId,
        checkoutUrl: paymentResult.checkoutUrl,
        clientReference: paymentResult.clientReference,
        message: 'Payment initiated successfully. Please complete payment in the checkout window.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Payment processing error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
