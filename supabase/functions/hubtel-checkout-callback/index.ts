
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('=== HUBTEL CALLBACK RECEIVED ===');
    
    const callbackData = await req.json();
    console.log('Callback Data:', JSON.stringify(callbackData, null, 2));

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-checkout-callback',
      level: 'info',
      message: 'Callback received',
      metadata: callbackData
    });

    // Extract payment details from callback
    const {
      Status,
      Data,
      ResponseCode,
      ClientReference
    } = callbackData;

    if (!ClientReference) {
      console.error('Missing ClientReference in callback');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing ClientReference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Extract detailed payment information from Data object
    const paymentDetails = Data || {};
    const {
      Channel,
      CustomerMobileNumber,
      PaymentType,
      Amount,
      AmountAfterCharges,
      Charges,
      Description,
      ExternalTransactionId,
      CheckoutId,
      SalesInvoiceId
    } = paymentDetails;

    console.log('Payment Details:', {
      Status,
      ResponseCode,
      ClientReference,
      Channel,
      CustomerMobileNumber,
      PaymentType,
      Amount
    });

    // Determine payment status based on Status field
    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    if (Status === 'Success' || ResponseCode === '0000') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    } else if (Status === 'Failed') {
      paymentStatus = 'failed';
      orderStatus = 'cancelled';
    } else if (Status === 'Cancelled') {
      paymentStatus = 'cancelled';
      orderStatus = 'cancelled';
    }

    console.log('Determined Status:', { paymentStatus, orderStatus });

    // Update payment transaction record
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('client_reference', ClientReference)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found for reference:', ClientReference);
      
      // Create new transaction record from callback data
      await supabase.from('payment_transactions').insert({
        client_reference: ClientReference,
        phone_number: CustomerMobileNumber,
        amount: Amount,
        payment_method: 'hubtel_online',
        status: paymentStatus,
        channel: Channel,
        customer_phone_number: CustomerMobileNumber,
        payment_type: PaymentType,
        external_transaction_id: ExternalTransactionId,
        checkout_id: CheckoutId,
        sales_invoice_id: SalesInvoiceId,
        charges: Charges,
        amount_after_charges: AmountAfterCharges,
        description: Description,
        payment_date: new Date().toISOString(),
        hubtel_response: callbackData
      });
    } else {
      // Update existing transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: paymentStatus,
          channel: Channel,
          customer_phone_number: CustomerMobileNumber,
          payment_type: PaymentType,
          external_transaction_id: ExternalTransactionId,
          charges: Charges,
          amount_after_charges: AmountAfterCharges,
          payment_date: new Date().toISOString(),
          hubtel_response: callbackData
        })
        .eq('client_reference', ClientReference);

      // Update order status if order exists
      if (transaction.order_id) {
        await supabase
          .from('orders')
          .update({
            payment_status: paymentStatus,
            order_status: orderStatus,
            payment_reference: ExternalTransactionId || ClientReference
          })
          .eq('id', transaction.order_id);

        console.log('Order updated:', transaction.order_id, 'Status:', orderStatus);

        // Send confirmation email if payment successful
        if (paymentStatus === 'paid') {
          try {
            await supabase.functions.invoke('send-order-email', {
              body: {
                orderType: 'regular',
                orderId: transaction.order_id
              }
            });
            console.log('Order confirmation email sent');
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
          }
        }
      }
    }

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-checkout-callback',
      level: 'info',
      message: `Payment ${paymentStatus}`,
      metadata: {
        clientReference: ClientReference,
        status: paymentStatus,
        channel: Channel,
        amount: Amount
      }
    });

    console.log('=== CALLBACK PROCESSED SUCCESSFULLY ===');

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
    console.error('=== CALLBACK ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    await supabase.from('function_logs').insert({
      function_name: 'hubtel-checkout-callback',
      level: 'error',
      message: error.message,
      stack_trace: error.stack,
      metadata: { error: error.toString() }
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Callback processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
