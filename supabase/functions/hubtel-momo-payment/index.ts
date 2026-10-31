
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const HUBTEL_API_ID = Deno.env.get('HUBTEL_API_ID') || '';
const HUBTEL_API_KEY = Deno.env.get('HUBTEL_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { phoneNumber, amount, clientReference, description } = await req.json();

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-momo-payment',
      level: 'info',
      message: 'MoMo payment request received',
      metadata: {
        phone: phoneNumber ? '***' + phoneNumber.slice(-4) : null,
        amount,
        reference: clientReference
      }
    });

    // Validate parameters
    if (!phoneNumber || !amount || !clientReference) {
      throw new Error('Missing required parameters: phoneNumber, amount, clientReference');
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '233' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('233')) {
      formattedPhone = '233' + formattedPhone;
    }

    // Validate phone format
    if (!/^233\d{9}$/.test(formattedPhone)) {
      throw new Error('Invalid phone number format. Must be a valid Ghana number.');
    }

    // Fetch settings
    const { data: settings } = await supabase
      .from('hubtel_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!settings) {
      throw new Error('Hubtel settings not configured');
    }

    // Construct auth header
    const authString = `${HUBTEL_API_ID}:${HUBTEL_API_KEY}`;
    const encodedAuth = btoa(authString);

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-momo-payment',
      level: 'info',
      message: 'Auth header constructed'
    });

    // Prepare payment payload
    const paymentPayload = {
      customerName: description || 'Customer',
      customerMsisdn: formattedPhone,
      customerEmail: '',
      channel: 'mtn-gh', // Default to MTN, can be made dynamic
      amount: parseFloat(amount).toFixed(2),
      primaryCallbackUrl: `${SUPABASE_URL}/functions/v1/hubtel-checkout-callback`,
      description: description || 'Payment',
      clientReference: clientReference
    };

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-momo-payment',
      level: 'info',
      message: 'Sending payment request to Hubtel',
      metadata: {
        payload: { ...paymentPayload, customerMsisdn: '***' + paymentPayload.customerMsisdn.slice(-4) }
      }
    });

    // Make API call
    const response = await fetch('https://api.hubtel.com/v1/merchantaccount/merchants/receive/mobilemoney', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-momo-payment',
      level: response.ok ? 'info' : 'error',
      message: `Payment response: ${response.status}`,
      metadata: {
        status: response.status,
        response: responseData
      }
    });

    if (!response.ok) {
      // Map common error codes
      let errorMessage = 'Payment failed';
      if (responseData.message?.includes('insufficient')) {
        errorMessage = 'Insufficient funds in mobile money account';
      } else if (responseData.message?.includes('invalid')) {
        errorMessage = 'Invalid phone number or account';
      } else if (responseData.message?.includes('timeout')) {
        errorMessage = 'Payment request timed out. Please try again.';
      }
      
      throw new Error(errorMessage);
    }

    // Create transaction record
    await supabase.from('payment_transactions').insert({
      client_reference: clientReference,
      phone_number: formattedPhone,
      amount: parseFloat(amount),
      payment_method: 'momo',
      status: 'pending',
      external_transaction_id: responseData.transactionId || responseData.TransactionId,
      hubtel_response: responseData
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: responseData.transactionId || responseData.TransactionId,
        status: responseData.status || 'pending',
        message: 'Payment initiated successfully. Please check your phone to approve.',
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('MoMo payment error:', error);

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-momo-payment',
      level: 'error',
      message: error.message,
      stack_trace: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
