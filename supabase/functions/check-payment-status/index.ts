
import { corsHeaders } from "./cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const HUBTEL_API_ID = Deno.env.get("HUBTEL_API_ID");
const HUBTEL_API_KEY = Deno.env.get("HUBTEL_API_KEY");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      throw new Error("Transaction ID is required");
    }

    // Check local database first
    const { data: localTransaction } = await supabase
      .from('payment_transactions')
      .select('*, orders(order_number, customer_name, total_amount)')
      .eq('transaction_id', transactionId)
      .single();

    if (localTransaction && localTransaction.status === 'completed') {
      return new Response(JSON.stringify({ 
        success: true,
        status: 'completed',
        transaction: localTransaction
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query Hubtel API for latest status
    const authString = btoa(`${HUBTEL_API_ID}:${HUBTEL_API_KEY}`);
    
    const statusResponse = await fetch(`https://payproxyapi.hubtel.com/items/status/${transactionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json"
      }
    });

    const statusData = await statusResponse.json();
    
    const isCompleted = statusData.responseCode === "0000" || statusData.status === "Success";
    const newStatus = isCompleted ? 'completed' : statusData.status === "Failed" ? 'failed' : 'pending';

    // Update local database
    await supabase
      .from('payment_transactions')
      .update({ 
        status: newStatus,
        hubtel_response: statusData,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId);

    // Update order if payment completed
    if (isCompleted && localTransaction) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', localTransaction.order_id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: newStatus,
      transaction: statusData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Status Check Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
