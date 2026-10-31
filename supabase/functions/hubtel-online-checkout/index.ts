
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Hubtel Online Checkout - Production Endpoint
 * Enhanced with comprehensive logging and flexible response parsing
 */

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    console.log('\n========================================');
    console.log('=== HUBTEL CHECKOUT REQUEST START ===');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    
    const requestBody = await req.json();
    
    // Log incoming request (sanitized)
    console.log('\n[REQUEST] Incoming request data:', {
      clientReference: requestBody.clientReference,
      amount: requestBody.totalAmount,
      hasPhone: !!requestBody.payeeMobileNumber,
      hasEmail: !!requestBody.payeeEmail,
      hasName: !!requestBody.payeeName
    });

    // ===== STEP 1: VALIDATE INPUTS =====
    console.log('\n[STEP 1] VALIDATION - Validating request inputs...');
    
    const validationErrors = [];
    
    if (!requestBody.totalAmount) {
      validationErrors.push('totalAmount is required');
    } else {
      const amount = parseFloat(requestBody.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        validationErrors.push('totalAmount must be a positive number');
      }
    }
    
    if (!requestBody.clientReference) {
      validationErrors.push('clientReference is required');
    } else if (requestBody.clientReference.length > 32) {
      validationErrors.push('clientReference must be max 32 characters');
    }
    
    if (validationErrors.length > 0) {
      console.error('[STEP 1] ❌ Validation failed:', validationErrors);
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'Validation failed',
        metadata: { errors: validationErrors, requestBody }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: validationErrors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('[STEP 1] ✅ Input validation passed');

    // ===== STEP 2: RETRIEVE CREDENTIALS =====
    console.log('\n[STEP 2] CREDENTIALS - Retrieving API credentials from Supabase secrets...');
    
    const HUBTEL_API_ID = Deno.env.get('HUBTEL_API_ID');
    const HUBTEL_API_KEY = Deno.env.get('HUBTEL_API_KEY');
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get('HUBTEL_MERCHANT_ACCOUNT');
    
    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      console.error('[STEP 2] ❌ Missing Hubtel credentials:', {
        hasApiId: !!HUBTEL_API_ID,
        hasApiKey: !!HUBTEL_API_KEY,
        hasMerchantAccount: !!HUBTEL_MERCHANT_ACCOUNT
      });
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'Missing Hubtel credentials',
        metadata: {
          hasApiId: !!HUBTEL_API_ID,
          hasApiKey: !!HUBTEL_API_KEY,
          hasMerchantAccount: !!HUBTEL_MERCHANT_ACCOUNT
        }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Payment provider credentials not configured',
          details: 'HUBTEL_API_ID, HUBTEL_API_KEY, or HUBTEL_MERCHANT_ACCOUNT missing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log('[STEP 2] ✅ Credentials retrieved:', {
      apiId: HUBTEL_API_ID,
      apiIdLength: HUBTEL_API_ID.length,
      apiKeyLength: HUBTEL_API_KEY.length,
      merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
      expectedApiId: '',
      expectedMerchant: '2037305',
      credentialsMatch: HUBTEL_API_ID === '' && HUBTEL_MERCHANT_ACCOUNT === '2037305'
    });

    // ===== STEP 3: FORMAT PHONE =====
    console.log('\n[STEP 3] PHONE - Processing phone number...');
    
    let formattedPhone = requestBody.payeeMobileNumber;
    if (formattedPhone) {
      const originalPhone = formattedPhone;
      formattedPhone = formattedPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '233' + formattedPhone.substring(1);
      }
      if (!formattedPhone.startsWith('233')) {
        formattedPhone = '233' + formattedPhone;
      }
      console.log('[STEP 3] ✅ Phone formatted:', {
        original: originalPhone,
        formatted: formattedPhone,
        lastFourDigits: '***' + formattedPhone.slice(-4)
      });
    } else {
      console.log('[STEP 3] ℹ️ No phone number provided');
    }

    // ===== STEP 4: PREPARE PAYLOAD =====
    console.log('\n[STEP 4] PAYLOAD - Constructing request payload...');
    
    const clientRef = requestBody.clientReference.substring(0, 32);
    
    const checkoutPayload = {
      totalAmount: parseFloat(requestBody.totalAmount).toFixed(2),
      description: requestBody.description || 'Payment',
      callbackUrl: requestBody.callbackUrl || `${SUPABASE_URL}/functions/v1/hubtel-checkout-callback`,
      returnUrl: requestBody.returnUrl || `${req.headers.get('origin')}/?payment_status=success`,
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
      cancellationUrl: requestBody.cancellationUrl || `${req.headers.get('origin')}/?payment_status=cancelled`,
      clientReference: clientRef
    };

    // Add optional fields
    if (requestBody.payeeName) {
      checkoutPayload.payeeName = requestBody.payeeName;
    }
    if (formattedPhone) {
      checkoutPayload.payeeMobileNumber = formattedPhone;
    }
    if (requestBody.payeeEmail) {
      checkoutPayload.payeeEmail = requestBody.payeeEmail;
    }
    
    console.log('[STEP 4] ✅ Payload constructed:', {
      ...checkoutPayload,
      payeeMobileNumber: checkoutPayload.payeeMobileNumber ? '***' + checkoutPayload.payeeMobileNumber.slice(-4) : undefined
    });

    // ===== STEP 5: CREATE AUTH HEADER =====
    console.log('\n[STEP 5] AUTH - Creating authentication header...');
    
    const authString = `${HUBTEL_API_ID}:${HUBTEL_API_KEY}`;
    const encodedAuth = btoa(authString);
    
    console.log('[STEP 5] ✅ Auth header created:', {
      format: 'Basic base64(API_ID:API_KEY)',
      encodedLength: encodedAuth.length,
      prefix: encodedAuth.substring(0, 15) + '***'
    });

    // ===== STEP 6: CONFIGURE REQUEST =====
    const apiEndpoint = 'https://payproxyapi.hubtel.com/items/initiate';
    
    const requestHeaders = {
      'Host': 'payproxyapi.hubtel.com',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${encodedAuth}`,
      'Cache-Control': 'no-cache'
    };
    
    console.log('\n[STEP 6] REQUEST CONFIG:');
    console.log('  Endpoint:', apiEndpoint);
    console.log('  Method: POST');
    console.log('  Headers:', {
      ...requestHeaders,
      Authorization: `Basic ${encodedAuth.substring(0, 15)}***`
    });
    console.log('  Payload:', JSON.stringify(checkoutPayload, null, 2));

    // ===== STEP 7: MAKE API REQUEST =====
    console.log('\n[STEP 7] API CALL - Sending request to Hubtel API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let hubtelResponse;
    const requestStartTime = Date.now();
    
    try {
      hubtelResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(checkoutPayload),
        signal: controller.signal
      });
      
      const requestDuration = Date.now() - requestStartTime;
      console.log('[STEP 7] ✅ Response received in', requestDuration + 'ms');
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[STEP 7] ❌ Request timeout after', REQUEST_TIMEOUT, 'ms');
        
        await supabase.from('function_logs').insert({
          function_name: 'hubtel-online-checkout',
          level: 'error',
          message: 'Request timeout',
          metadata: { timeout: REQUEST_TIMEOUT }
        });
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'TIMEOUT',
            message: 'Request timed out - please try again',
            details: `Request exceeded ${REQUEST_TIMEOUT/1000} second timeout`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 408 }
        );
      }
      
      console.error('[STEP 7] ❌ Network error:', fetchError);
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'Network connection failed',
        metadata: { error: fetchError.message, errorType: fetchError.name }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API_CONNECTION_FAILED',
          message: 'Could not connect to payment provider',
          details: fetchError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }
    
    clearTimeout(timeoutId);

    // ===== STEP 8: ANALYZE RAW RESPONSE =====
    console.log('\n[STEP 8] RAW RESPONSE - Analyzing response...');
    console.log('  HTTP Status:', hubtelResponse.status, hubtelResponse.statusText);
    console.log('  Content-Type:', hubtelResponse.headers.get('content-type'));
    console.log('  Content-Length:', hubtelResponse.headers.get('content-length'));
    
    // Log all headers
    console.log('  Response Headers:');
    for (const [key, value] of hubtelResponse.headers.entries()) {
      console.log(`    ${key}: ${value}`);
    }

    // Get raw response text
    const responseText = await hubtelResponse.text();
    console.log('\n[STEP 8] RAW RESPONSE TEXT:');
    console.log('  Length:', responseText.length, 'bytes');
    console.log('  Empty:', responseText.length === 0);
    console.log('  First 500 chars:', responseText.substring(0, 500));
    console.log('  FULL RESPONSE TEXT:', responseText);

    // ===== STEP 9: CHECK EMPTY RESPONSE =====
    if (!responseText || responseText.trim().length === 0) {
      console.error('\n[STEP 9] ❌❌❌ EMPTY RESPONSE DETECTED ❌❌❌');
      console.error('HTTP Status:', hubtelResponse.status);
      console.error('Credentials used:');
      console.error('  API ID:', HUBTEL_API_ID);
      console.error('  Merchant Account:', HUBTEL_MERCHANT_ACCOUNT);
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'Empty response from Hubtel API',
        metadata: {
          status: hubtelResponse.status,
          statusText: hubtelResponse.statusText,
          headers: Object.fromEntries(hubtelResponse.headers.entries())
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'EMPTY_RESPONSE',
          message: 'Empty response from payment provider',
          httpStatus: hubtelResponse.status,
          debugInfo: {
            endpoint: apiEndpoint,
            merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
            apiId: HUBTEL_API_ID
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 10: PARSE JSON =====
    console.log('\n[STEP 10] JSON PARSING - Attempting to parse response...');
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('[STEP 10] ✅ JSON parsed successfully');
      
      // COMPREHENSIVE RESPONSE ANALYSIS
      console.log('\n========== PARSED RESPONSE ANALYSIS ==========');
      console.log('Type:', typeof responseData);
      console.log('Is Array:', Array.isArray(responseData));
      console.log('Top-level keys:', Object.keys(responseData));
      console.log('Full parsed object:', JSON.stringify(responseData, null, 2));
      
      // Analyze each top-level property
      for (const [key, value] of Object.entries(responseData)) {
        console.log(`\nProperty "${key}":`);
        console.log(`  Type: ${typeof value}`);
        console.log(`  Value: ${JSON.stringify(value, null, 2)}`);
        
        if (typeof value === 'object' && value !== null) {
          console.log(`  Nested keys: ${Object.keys(value).join(', ')}`);
        }
      }
      console.log('========== END PARSED RESPONSE ANALYSIS ==========\n');
      
    } catch (jsonError) {
      console.error('[STEP 10] ❌ JSON Parse Error:', jsonError.message);
      console.error('Parse error stack:', jsonError.stack);
      console.error('Raw text that failed to parse:', responseText);
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'Invalid JSON response',
        metadata: {
          status: hubtelResponse.status,
          parseError: jsonError.message,
          responseText: responseText.substring(0, 1000)
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Invalid response format from payment provider',
          details: `JSON parsing failed: ${jsonError.message}`,
          rawResponse: responseText.substring(0, 500),
          statusCode: hubtelResponse.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 11: FLEXIBLE PROPERTY EXTRACTION =====
    console.log('\n[STEP 11] PROPERTY EXTRACTION - Extracting response properties...');
    
    // Try multiple property name formats
    const codeProperties = ['ResponseCode', 'responseCode', 'response_code', 'code', 'Code', 'statusCode'];
    const statusProperties = ['Status', 'status', 'response_status', 'responseStatus'];
    const messageProperties = ['Message', 'message', 'msg', 'description'];
    const dataProperties = ['Data', 'data', 'result', 'Result', 'response_data'];
    
    let responseCode = null;
    let status = null;
    let message = null;
    let data = null;
    
    // Extract ResponseCode
    for (const prop of codeProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        responseCode = String(responseData[prop]);
        console.log(`[STEP 11] ✅ Found ResponseCode at: "${prop}" = "${responseCode}"`);
        break;
      }
    }
    
    // Check nested ResponseCode
    if (!responseCode && responseData.response?.ResponseCode) {
      responseCode = String(responseData.response.ResponseCode);
      console.log(`[STEP 11] ✅ Found ResponseCode at: "response.ResponseCode" = "${responseCode}"`);
    }
    
    if (!responseCode && responseData.data?.ResponseCode) {
      responseCode = String(responseData.data.ResponseCode);
      console.log(`[STEP 11] ✅ Found ResponseCode at: "data.ResponseCode" = "${responseCode}"`);
    }
    
    // Extract Status
    for (const prop of statusProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        status = String(responseData[prop]);
        console.log(`[STEP 11] ✅ Found Status at: "${prop}" = "${status}"`);
        break;
      }
    }
    
    // Extract Message
    for (const prop of messageProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        message = String(responseData[prop]);
        console.log(`[STEP 11] ✅ Found Message at: "${prop}" = "${message}"`);
        break;
      }
    }
    
    // Extract Data
    for (const prop of dataProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        data = responseData[prop];
        console.log(`[STEP 11] ✅ Found Data at: "${prop}"`);
        console.log(`[STEP 11] Data content:`, JSON.stringify(data, null, 2));
        break;
      }
    }
    
    // Log extraction results
    console.log('\n[STEP 11] EXTRACTION RESULTS:');
    console.log(`  ResponseCode: ${responseCode || 'NOT FOUND'}`);
    console.log(`  Status: ${status || 'NOT FOUND'}`);
    console.log(`  Message: ${message || 'NOT FOUND'}`);
    console.log(`  Data: ${data ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!responseCode) {
      console.error('\n[STEP 11] ❌ CRITICAL: ResponseCode not found in any known format!');
      console.error('Available top-level properties:', Object.keys(responseData));
      console.error('Full response structure:', JSON.stringify(responseData, null, 2));
      
      await supabase.from('function_logs').insert({
        function_name: 'hubtel-online-checkout',
        level: 'error',
        message: 'ResponseCode not found in response',
        metadata: {
          status: hubtelResponse.status,
          availableProperties: Object.keys(responseData),
          fullResponse: responseData
        }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_RESPONSE_FORMAT',
          message: 'Response missing ResponseCode property',
          details: 'Unable to extract ResponseCode from response',
          availableProperties: Object.keys(responseData),
          fullResponse: responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 12: CHECK RESPONSE CODE =====
    console.log('\n[STEP 12] RESPONSE CODE CHECK - Validating response code...');
    console.log('  ResponseCode:', responseCode);
    console.log('  Message:', message);
    console.log('  Status:', status);

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-online-checkout',
      level: responseCode === '0000' ? 'info' : 'error',
      message: `Hubtel API response: ${responseCode}`,
      metadata: {
        status: hubtelResponse.status,
        responseCode: responseCode,
        message: message,
        fullResponse: responseData
      }
    });

    if (responseCode !== '0000') {
      console.error('[STEP 12] ❌ API Error - ResponseCode:', responseCode);
      console.error('Error message:', message);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CHECKOUT_FAILED',
          message: message || 'Payment initiation failed',
          responseCode: responseCode,
          details: responseData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ===== STEP 13: EXTRACT CHECKOUT DATA =====
    console.log('\n[STEP 13] CHECKOUT DATA - Extracting checkout information...');
    
    const checkoutData = data || {};
    
    // Try multiple property names for checkout URL
    const checkoutUrl = checkoutData.CheckoutUrl || checkoutData.checkoutUrl || 
                       checkoutData.checkout_url || checkoutData.url;
    const checkoutId = checkoutData.CheckoutId || checkoutData.checkoutId || 
                      checkoutData.checkout_id || checkoutData.id;
    const salesInvoiceId = checkoutData.SalesInvoiceId || checkoutData.salesInvoiceId || 
                          checkoutData.sales_invoice_id || checkoutData.invoiceId;

    console.log('[STEP 13] Extracted values:');
    console.log('  CheckoutUrl:', checkoutUrl || 'NOT FOUND');
    console.log('  CheckoutId:', checkoutId || 'NOT FOUND');
    console.log('  SalesInvoiceId:', salesInvoiceId || 'NOT FOUND');

    if (!checkoutUrl) {
      console.error('[STEP 13] ❌ Missing checkoutUrl in response');
      console.error('Data object:', JSON.stringify(checkoutData, null, 2));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_RESPONSE',
          message: 'No checkout URL received from payment provider',
          details: responseData,
          dataObject: checkoutData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
    
    console.log('[STEP 13] ✅ Checkout URL received:', checkoutUrl);

    // ===== STEP 14: CREATE ORDER =====
    console.log('\n[STEP 14] DATABASE - Creating order in database...');
    
    let orderId = null;
    if (requestBody.cartItems) {
      const orderData = {
        customer_name: requestBody.payeeName || 'Customer',
        customer_email: requestBody.payeeEmail || '',
        customer_phone: formattedPhone || '',
        delivery_address: requestBody.deliveryAddress || '',
        total_amount: parseFloat(requestBody.totalAmount),
        payment_status: 'pending',
        payment_method: 'hubtel_online',
        payment_reference: clientRef,
        order_status: 'pending',
        order_items: requestBody.cartItems || [],
        customization_notes: requestBody.customizationNotes || ''
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (!orderError && order) {
        orderId = order.id;
        
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const displayOrderId = `AB${randomDigits}`;
        
        await supabase
          .from('orders')
          .update({ order_number: displayOrderId })
          .eq('id', order.id);
          
        console.log('[STEP 14] ✅ Order created:', orderId, 'Display ID:', displayOrderId);
      } else {
        console.error('[STEP 14] ❌ Order creation failed:', orderError);
      }
    }

    // ===== STEP 15: CREATE TRANSACTION RECORD =====
    console.log('\n[STEP 15] TRANSACTION - Creating payment transaction record...');
    
    await supabase.from('payment_transactions').insert({
      order_id: orderId,
      client_reference: clientRef,
      phone_number: formattedPhone,
      amount: parseFloat(requestBody.totalAmount),
      payment_method: 'hubtel_online',
      status: 'pending',
      checkout_id: checkoutId,
      sales_invoice_id: salesInvoiceId,
      hubtel_response: responseData
    });
    
    console.log('[STEP 15] ✅ Transaction record created');

    console.log('\n========================================');
    console.log('=== CHECKOUT SUCCESS ===');
    console.log('CheckoutURL:', checkoutUrl);
    console.log('========================================\n');
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: checkoutUrl,
        checkoutId: checkoutId,
        salesInvoiceId: salesInvoiceId,
        clientReference: clientRef,
        orderId: orderId,
        message: 'Checkout initiated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('\n========================================');
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    
    await supabase.from('function_logs').insert({
      function_name: 'hubtel-online-checkout',
      level: 'error',
      message: error.message,
      stack_trace: error.stack,
      metadata: { error: error.toString() }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'CHECKOUT_FAILED',
        message: error.message || 'Checkout initiation failed',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
