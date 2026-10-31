
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  // Hubtel callbacks are POST requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callbackData = await req.json();
    console.log("Received Hubtel Callback:", JSON.stringify(callbackData, null, 2));

    const { ResponseCode, Message, Data } = callbackData;
    
    if (!Data || !Data.ClientReference) {
        console.error("Invalid Callback Data: Missing ClientReference");
        return new Response(JSON.stringify({ message: "Invalid payload" }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    const clientRef = Data.ClientReference;
    const newStatus = ResponseCode === '0000' ? 'completed' : 'failed';
    
    // Update Transaction
    const { error } = await supabase
        .from('payment_transactions')
        .update({
            status: newStatus,
            external_transaction_id: Data.ExternalTransactionId,
            payment_date: Data.PaymentDate ? new Date(Data.PaymentDate).toISOString() : new Date().toISOString(),
            charges: Data.Charges,
            amount_after_charges: Data.AmountAfterCharges,
            hubtel_response: callbackData, // Update with latest full response
            updated_at: new Date().toISOString()
        })
        .eq('client_reference', clientRef);

    if (error) {
        console.error("Error updating transaction:", error);
        throw error;
    }

    console.log(`Updated transaction ${clientRef} to ${newStatus}`);

    // Return 200 OK to Hubtel to acknowledge receipt
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Callback Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
