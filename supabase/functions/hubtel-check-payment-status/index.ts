
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const maskString = (str: string | null | undefined) => {
  if (!str) return "MISSING";
  if (str.length <= 8) return "********";
  return `${str.substring(0, 4)}****${str.substring(str.length - 4)}`;
};

interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  status: "success" | "error" | "info" | "warning";
  data?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const debugLogs: LogEntry[] = [];
  const addLog = (step: string, message: string, status: LogEntry['status'] = 'info', data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      step,
      message,
      status,
      data: data ? JSON.parse(JSON.stringify(data, (key, value) => {
         if (['authorization', 'client_secret', 'api_key'].includes(key.toLowerCase())) return maskString(value);
         return value;
      })) : undefined
    };
    debugLogs.push(entry);
    console.log(`[${status.toUpperCase()}] ${step}: ${message}`, data ? JSON.stringify(entry.data) : '');
  };

  try {
    addLog("Initialization", "Check Payment Status function started");

    const requestData = await req.json();
    const { invoiceId, clientReference } = requestData;

    addLog("Input", "Parameters Received", "info", { invoiceId, clientReference });

    if (!invoiceId && !clientReference) {
        throw new Error("Missing invoiceId or clientReference");
    }

    // Credentials
    const ENV_CLIENT_ID = Deno.env.get("HUBTEL_CLIENT_ID");
    const ENV_CLIENT_SECRET = Deno.env.get("HUBTEL_CLIENT_SECRET");
    const HUBTEL_CLIENT_ID = ENV_CLIENT_ID || "";
    const HUBTEL_CLIENT_SECRET = ENV_CLIENT_SECRET || "";
    const MERCHANT_ACCOUNT_NUMBER = "2037305";

    const authString = btoa(`${HUBTEL_CLIENT_ID}:${HUBTEL_CLIENT_SECRET}`);
    
    // Look up transaction if only clientReference provided to get proper ID or verify record
    let transactionRecord;
    if (clientReference) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('client_reference', clientReference)
            .maybeSingle();
        
        if (data) transactionRecord = data;
    }

    // Prioritize passed invoiceId, fallback to DB record
    const searchId = invoiceId || transactionRecord?.sales_invoice_id || transactionRecord?.checkout_id;
    
    if (!searchId) {
         // If we still don't have an ID to query hubtel with
         throw new Error("Could not resolve a valid Invoice ID or Checkout ID to query Hubtel.");
    }

    // Construct Status URL
    // Endpoint: https://api-txnstatus.hubtel.com/transactions/{merchantAccountNumber}/status?hubtelTxnId={invoiceId}
    // Note: Documentation varies, sometimes it uses clientReference. Let's try flexible approach.
    let statusUrl = `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT_NUMBER}/status?hubtelTxnId=${searchId}`;
    
    // If we have clientReference, we can also try searching by that if invoiceId fails, 
    // but the endpoint usually expects hubtelTxnId or clientReference
    if (!invoiceId && clientReference) {
         statusUrl = `https://api-txnstatus.hubtel.com/transactions/${MERCHANT_ACCOUNT_NUMBER}/status?clientReference=${clientReference}`;
    }

    addLog("Request", "Querying Hubtel Status API", "info", { 
        url: statusUrl,
        auth: `Basic ${maskString(authString)}`
    });

    const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/json"
        }
    });

    const responseText = await response.text();
    addLog("Response", "Hubtel API Response", response.ok ? "success" : "warning", {
        status: response.status,
        body: responseText
    });

    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        throw new Error("Invalid JSON from Hubtel Status API");
    }

    // Determine status from Hubtel response
    // Usually Data.Status or Data.TransactionStatus
    const hubtelStatus = data?.Data?.Status || data?.data?.status || data?.Status || "Unknown";
    
    // Normalize status to our system
    let localStatus = "pending";
    if (hubtelStatus.toLowerCase() === "success" || hubtelStatus.toLowerCase() === "paid") localStatus = "completed";
    else if (hubtelStatus.toLowerCase() === "failed") localStatus = "failed";

    // Update database if we found a record
    if (transactionRecord) {
        if (transactionRecord.status !== localStatus) {
            await supabase.from('payment_transactions')
                .update({ 
                    status: localStatus,
                    hubtel_response: { ...transactionRecord.hubtel_response, status_check: data },
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionRecord.id);
            
            addLog("Database", "Updated transaction status", "success", { old: transactionRecord.status, new: localStatus });
        } else {
            addLog("Database", "Status unchanged", "info");
        }
    }

    return new Response(JSON.stringify({
        success: true,
        status: localStatus,
        hubtelStatus: hubtelStatus,
        data: data,
        debugLogs: debugLogs
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    addLog("Error", error.message, "error");
    return new Response(JSON.stringify({
      success: false,
      message: error.message,
      debugLogs: debugLogs
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
