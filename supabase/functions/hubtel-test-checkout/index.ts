
import { corsHeaders } from "./cors.ts";

/**
 * TEST ENDPOINT for Hubtel API Debugging
 * Enhanced with comprehensive logging and flexible response parsing
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs = [];
  const addLog = (step, data) => {
    const logEntry = { step, timestamp: new Date().toISOString(), data };
    logs.push(logEntry);
    console.log(`[${step}]`, JSON.stringify(data, null, 2));
  };

  try {
    addLog('START', { message: 'Test checkout initiated' });
    console.log('\n========================================');
    console.log('=== HUBTEL TEST CHECKOUT ===');
    console.log('========================================\n');

    // ===== STEP 1: RETRIEVE CREDENTIALS =====
    addLog('STEP_1', { message: 'Retrieving API credentials from Supabase secrets' });
    
    const HUBTEL_API_ID = Deno.env.get('HUBTEL_API_ID');
    const HUBTEL_API_KEY = Deno.env.get('HUBTEL_API_KEY');
    const HUBTEL_MERCHANT_ACCOUNT = Deno.env.get('HUBTEL_MERCHANT_ACCOUNT');
    
    if (!HUBTEL_API_ID || !HUBTEL_API_KEY || !HUBTEL_MERCHANT_ACCOUNT) {
      addLog('ERROR', { 
        message: 'Missing credentials',
        hasApiId: !!HUBTEL_API_ID,
        hasApiKey: !!HUBTEL_API_KEY,
        hasMerchantAccount: !!HUBTEL_MERCHANT_ACCOUNT
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MISSING_CREDENTIALS',
          message: 'API credentials not found in Supabase secrets',
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    addLog('STEP_2', { 
      message: 'Credentials retrieved successfully',
      apiId: HUBTEL_API_ID,
      apiIdLength: HUBTEL_API_ID.length,
      apiKeyLength: HUBTEL_API_KEY.length,
      merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
      expectedApiId: '',
      expectedMerchant: '2037305',
      credentialsMatch: HUBTEL_API_ID === '' && HUBTEL_MERCHANT_ACCOUNT === '2037305'
    });

    // ===== STEP 2: CREATE AUTH HEADER =====
    addLog('STEP_3', { message: 'Creating Basic Auth header' });
    
    const authString = `${HUBTEL_API_ID}:${HUBTEL_API_KEY}`;
    const encodedAuth = btoa(authString);
    
    addLog('STEP_4', {
      message: 'Auth header created',
      format: 'Basic base64(API_ID:API_KEY)',
      encodedLength: encodedAuth.length,
      prefix: encodedAuth.substring(0, 15) + '***'
    });

    // ===== STEP 3: PREPARE TEST REQUEST =====
    const testPayload = {
      totalAmount: "100.00",
      description: "Test Payment - Hubtel Integration Verification",
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/hubtel-checkout-callback`,
      returnUrl: "https://example.com/success",
      merchantAccountNumber: HUBTEL_MERCHANT_ACCOUNT,
      cancellationUrl: "https://example.com/cancel",
      clientReference: `TEST-${Date.now()}`.substring(0, 32)
    };

    addLog('STEP_5', {
      message: 'Test payload prepared',
      payload: testPayload
    });

    // ===== STEP 4: CONFIGURE REQUEST =====
    const apiEndpoint = 'https://payproxyapi.hubtel.com/items/initiate';
    
    const requestHeaders = {
      'Host': 'payproxyapi.hubtel.com',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${encodedAuth}`,
      'Cache-Control': 'no-cache'
    };

    addLog('STEP_6', {
      message: 'Request configuration',
      endpoint: apiEndpoint,
      method: 'POST',
      headers: {
        ...requestHeaders,
        Authorization: `Basic ${encodedAuth.substring(0, 15)}***`
      },
      payload: testPayload
    });

    // ===== STEP 5: MAKE API REQUEST =====
    addLog('STEP_7', { message: 'Sending request to Hubtel API...' });
    
    const startTime = Date.now();
    let response;
    
    try {
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(testPayload)
      });
      
      const duration = Date.now() - startTime;

      addLog('STEP_8', {
        message: 'Response received',
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      // Log all response headers
      const headerEntries = {};
      for (const [key, value] of response.headers.entries()) {
        headerEntries[key] = value;
      }
      addLog('STEP_8_HEADERS', {
        message: 'Response headers',
        headers: headerEntries
      });

    } catch (fetchError) {
      addLog('ERROR', {
        message: 'Network request failed',
        error: fetchError.message,
        errorType: fetchError.name,
        stack: fetchError.stack
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'NETWORK_ERROR',
          message: `Network request failed: ${fetchError.message}`,
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // ===== STEP 6: READ RAW RESPONSE =====
    addLog('STEP_9', { message: 'Reading response body...' });
    
    const responseText = await response.text();
    
    addLog('STEP_10', {
      message: 'Response body retrieved',
      bodyLength: responseText.length,
      isEmpty: responseText.length === 0,
      first500Chars: responseText.substring(0, 500),
      fullBody: responseText
    });

    // ===== STEP 7: CHECK EMPTY RESPONSE =====
    if (!responseText || responseText.trim().length === 0) {
      addLog('ERROR', {
        message: 'EMPTY RESPONSE RECEIVED',
        httpStatus: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        credentialsUsed: {
          apiId: HUBTEL_API_ID,
          merchantAccount: HUBTEL_MERCHANT_ACCOUNT
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'EMPTY_RESPONSE',
          message: 'Hubtel API returned empty response',
          httpStatus: response.status,
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 8: PARSE JSON WITH COMPREHENSIVE ANALYSIS =====
    addLog('STEP_11', { message: 'Parsing JSON response...' });
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      
      // COMPREHENSIVE RESPONSE ANALYSIS
      addLog('STEP_11_PARSED', {
        message: 'JSON parsed successfully',
        responseType: typeof responseData,
        isArray: Array.isArray(responseData),
        topLevelKeys: Object.keys(responseData),
        fullResponse: responseData
      });
      
      // Analyze each property
      const propertyAnalysis = {};
      for (const [key, value] of Object.entries(responseData)) {
        propertyAnalysis[key] = {
          type: typeof value,
          value: value,
          isObject: typeof value === 'object' && value !== null,
          nestedKeys: (typeof value === 'object' && value !== null) ? Object.keys(value) : []
        };
      }
      
      addLog('STEP_11_ANALYSIS', {
        message: 'Property analysis',
        properties: propertyAnalysis
      });

    } catch (parseError) {
      addLog('ERROR', {
        message: 'JSON parsing failed',
        error: parseError.message,
        stack: parseError.stack,
        rawResponse: responseText
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_JSON',
          message: 'Response is not valid JSON',
          rawResponse: responseText,
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 9: FLEXIBLE PROPERTY EXTRACTION =====
    addLog('STEP_12', { message: 'Extracting response properties with flexible detection...' });
    
    // Try multiple property name formats
    const codeProperties = ['ResponseCode', 'responseCode', 'response_code', 'code', 'Code'];
    const statusProperties = ['Status', 'status', 'response_status', 'responseStatus'];
    const messageProperties = ['Message', 'message', 'msg', 'description'];
    const dataProperties = ['Data', 'data', 'result', 'Result'];
    
    let responseCode = null;
    let status = null;
    let message = null;
    let data = null;
    
    // Extract ResponseCode
    for (const prop of codeProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        responseCode = String(responseData[prop]);
        addLog('STEP_12_CODE_FOUND', {
          message: `Found ResponseCode at property: ${prop}`,
          value: responseCode
        });
        break;
      }
    }
    
    // Check nested ResponseCode
    if (!responseCode && responseData.response?.ResponseCode) {
      responseCode = String(responseData.response.ResponseCode);
      addLog('STEP_12_CODE_NESTED', {
        message: 'Found ResponseCode at nested path: response.ResponseCode',
        value: responseCode
      });
    }
    
    // Extract Status
    for (const prop of statusProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        status = String(responseData[prop]);
        addLog('STEP_12_STATUS_FOUND', {
          message: `Found Status at property: ${prop}`,
          value: status
        });
        break;
      }
    }
    
    // Extract Message
    for (const prop of messageProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        message = String(responseData[prop]);
        addLog('STEP_12_MESSAGE_FOUND', {
          message: `Found Message at property: ${prop}`,
          value: message
        });
        break;
      }
    }
    
    // Extract Data
    for (const prop of dataProperties) {
      if (responseData[prop] !== undefined && responseData[prop] !== null) {
        data = responseData[prop];
        addLog('STEP_12_DATA_FOUND', {
          message: `Found Data at property: ${prop}`,
          dataContent: data
        });
        break;
      }
    }
    
    // Log extraction results
    addLog('STEP_12_RESULTS', {
      message: 'Property extraction results',
      responseCode: responseCode || 'NOT FOUND',
      status: status || 'NOT FOUND',
      message: message || 'NOT FOUND',
      hasData: !!data,
      availableProperties: Object.keys(responseData)
    });
    
    if (!responseCode) {
      addLog('ERROR', {
        message: 'ResponseCode not found in any known format',
        availableProperties: Object.keys(responseData),
        fullResponse: responseData
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INVALID_RESPONSE_FORMAT',
          message: 'ResponseCode not found in response',
          availableProperties: Object.keys(responseData),
          fullResponse: responseData,
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // ===== STEP 10: CHECK RESPONSE CODE =====
    if (responseCode !== '0000') {
      addLog('STEP_13', {
        message: 'API returned error code',
        responseCode: responseCode,
        errorMessage: message,
        fullResponse: responseData
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'API_ERROR',
          message: message || 'Hubtel API returned error',
          responseCode: responseCode,
          fullResponse: responseData,
          logs
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ===== STEP 11: EXTRACT CHECKOUT DATA =====
    const checkoutData = data || {};
    
    const checkoutUrl = checkoutData.CheckoutUrl || checkoutData.checkoutUrl || checkoutData.checkout_url;
    const checkoutId = checkoutData.CheckoutId || checkoutData.checkoutId || checkoutData.checkout_id;
    const salesInvoiceId = checkoutData.SalesInvoiceId || checkoutData.salesInvoiceId || checkoutData.sales_invoice_id;
    
    addLog('SUCCESS', {
      message: '✅ Test checkout successful!',
      responseCode: responseCode,
      checkoutUrl: checkoutUrl,
      checkoutId: checkoutId,
      salesInvoiceId: salesInvoiceId,
      credentialsUsed: {
        apiId: HUBTEL_API_ID,
        merchantAccount: HUBTEL_MERCHANT_ACCOUNT
      }
    });

    console.log('\n========================================');
    console.log('=== TEST CHECKOUT SUCCESS ===');
    console.log('========================================\n');

    return new Response(
      JSON.stringify({
        success: true,
        message: '✅ Hubtel API connection working correctly!',
        responseCode: responseCode,
        data: data,
        checkoutUrl: checkoutUrl,
        checkoutId: checkoutId,
        salesInvoiceId: salesInvoiceId,
        logs,
        credentialsVerification: {
          apiId: HUBTEL_API_ID,
          merchantAccount: HUBTEL_MERCHANT_ACCOUNT,
          apiIdCorrect: HUBTEL_API_ID === '',
          merchantAccountCorrect: HUBTEL_MERCHANT_ACCOUNT === '2037305'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    addLog('ERROR', {
      message: 'Unexpected error',
      error: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'UNEXPECTED_ERROR',
        message: error.message,
        stack: error.stack,
        logs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
