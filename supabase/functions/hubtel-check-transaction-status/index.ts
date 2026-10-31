
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

/**
 * Hubtel Transaction Status Check
 * Retrieves transaction status using correct credentials from Supabase secrets
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('=== HUBTEL TRANSACTION STATUS CHECK ===');
    
    const { clientReference, checkoutId, salesInvoiceId } = await req.json();

    if (!clientReference && !checkoutId && !salesInvoiceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_IDENTIFIER',
          message: 'At least one identifier required (clientReference, checkoutId, or salesInvoiceId)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Retrieve credentials from Supabase secrets
    console.log('Retrieving credentials from Supabase secrets...');
    
    const HUBTEL_API_ID = Deno.env.get('HUBTEL_API_ID');
    const HUBTEL_API_KEY = Deno.env.get('HUBTEL_API_KEY');
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get('HUBTEL_MERCHANT_ACCOUNT');

    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      console.error('Missing Hubtel credentials from Supabase secrets');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Payment provider credentials not configured',
          details: {
            hasApiId: !!HUBTEL_API_ID,
            hasApiKey: !!HUBTEL_API_KEY,
            hasMerchantAccount: !!HUBTEL_MERCHANT_ACCOUNT
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Credentials retrieved:', {
      apiId: HUBTEL_API_ID,
      merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
      expectedApiId: '',
      expectedMerchant: '2037305'
    });

    // Create Basic Auth header
    const authString = `${HUBTEL_API_ID}:${HUBTEL_API_KEY}`;
    const encodedAuth = btoa(authString);

    // Construct status check endpoint
    let statusEndpoint;
    if (salesInvoiceId) {
      statusEndpoint = `https://payproxyapi.hubtel.com/items/status/${salesInvoiceId}`;
    } else if (checkoutId) {
      statusEndpoint = `https://payproxyapi.hubtel.com/items/checkout/status/${checkoutId}`;
    } else {
      statusEndpoint = `https://payproxyapi.hubtel.com/items/status/merchant/${HUBTEL_MERCHANT_ACCOUNT}/${clientReference}`;
    }

    console.log('Status endpoint:', statusEndpoint);

    const headers = {
      'Host': 'payproxyapi.hubtel.com',
      'Accept': 'application/json',
      'Authorization': `Basic ${encodedAuth}`,
      'Cache-Control': 'no-cache'
    };

    console.log('Request headers:', {
      ...headers,
      Authorization: `Basic ${encodedAuth.substring(0, 10)}***`
    });

    // Make API request
    const response = await fetch(statusEndpoint, {
      method: 'GET',
      headers: headers
    });

    console.log('Response status:', response.status);

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!responseText || responseText.trim().length === 0) {
      console.error('Empty response from Hubtel API');
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-check-transaction-status',
        level: 'error',
        message: 'Empty response from Hubtel API',
        metadata: {
          status: response.status,
          endpoint: statusEndpoint
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'EMPTY_RESPONSE',
          message: 'Empty response from payment provider',
          httpStatus: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Invalid response format',
          rawResponse: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    console.log('Parsed response:', responseData);

    // Log to database
    await supabase.from('function_logs').insert({
      function_name: 'hubtel-check-transaction-status',
      level: 'info',
      message: 'Transaction status checked',
      metadata: {
        identifier: clientReference || checkoutId || salesInvoiceId,
        responseCode: responseData.ResponseCode,
        status: responseData.Data?.Status
      }
    });

    // Update transaction status in database if found
    if (responseData.ResponseCode === '0000' && responseData.Data) {
      const status = responseData.Data.Status;
      const transactionStatus = status === 'Success' ? 'paid' : status === 'Failed' ? 'failed' : 'pending';

      if (clientReference) {
        await supabase
          .from('payment_transactions')
          .update({
            status: transactionStatus,
            hubtel_response: responseData,
            updated_at: new Date().toISOString()
          })
          .eq('client_reference', clientReference);
      }
    }

    return new Response(
      JSON.stringify({
        success: responseData.ResponseCode === '0000',
        responseCode: responseData.ResponseCode,
        message: responseData.Message,
        data: responseData.Data,
        fullResponse: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error checking transaction status:', error);
    
    await supabase.from('function_logs').insert({
      function_name: 'hubtel-check-transaction-status',
      level: 'error',
      message: error.message,
      stack_trace: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'STATUS_CHECK_FAILED',
        message: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
