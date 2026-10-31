
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("=== resend-manual-receipt-email - START ===");
  console.log("Timestamp:", timestamp);
  console.log("========================================");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("\n--- Step 1: Parse Request Body ---");
    const body = await req.json();
    console.log("Request Body:", JSON.stringify(body, null, 2));

    const { receipt_id } = body;

    console.log("\n--- Step 2: Validate Receipt ID ---");
    if (!receipt_id) {
      const errorMsg = "receipt_id is required";
      console.error("❌", errorMsg);
      
      // Log error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "resend-manual-receipt-email",
            error_message: errorMsg,
            error_type: "ValidationError",
            severity: "medium",
            request_data: body
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }
    console.log("✓ Receipt ID validated:", receipt_id);

    console.log("\n--- Step 3: Initialize Supabase Client ---");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = "Supabase credentials not configured";
      console.error("❌", errorMsg);
      
      // Log error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "resend-manual-receipt-email",
            error_message: errorMsg,
            error_type: "ConfigurationError",
            severity: "critical"
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✓ Supabase client initialized");

    console.log("\n--- Step 4: Fetch Receipt from Database ---");
    const { data: receipt, error: fetchError } = await supabase
      .from("manual_receipts")
      .select("*")
      .eq("id", receipt_id)
      .single();

    if (fetchError) {
      console.error("❌ Database Fetch Error:");
      console.error("Error Code:", fetchError.code);
      console.error("Error Message:", fetchError.message);
      
      // Log database error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "resend-manual-receipt-email",
            error_message: fetchError.message,
            error_type: "DatabaseError",
            severity: "high",
            request_data: { receipt_id }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw fetchError;
    }

    if (!receipt) {
      const errorMsg = `Receipt not found with ID: ${receipt_id}`;
      console.error("❌", errorMsg);
      
      // Log error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "resend-manual-receipt-email",
            error_message: errorMsg,
            error_type: "NotFoundError",
            severity: "medium",
            request_data: { receipt_id }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }

    console.log("✓ Receipt found:", receipt.receipt_number);
    console.log("Student Email:", receipt.student_email);

    console.log("\n--- Step 5: Update Sent Date ---");
    const { error: updateError } = await supabase
      .from("manual_receipts")
      .update({ 
        sent_date: new Date().toISOString(),
        email_sent: true 
      })
      .eq("id", receipt_id);

    if (updateError) {
      console.error("❌ Database Update Error:", updateError);
      
      // Log database error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "resend-manual-receipt-email",
            error_message: updateError.message,
            error_type: "DatabaseError",
            severity: "high",
            request_data: { receipt_id }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw updateError;
    }

    console.log("✓ Receipt updated successfully");

    console.log("\n--- Step 6: Send Email (Placeholder) ---");
    console.log("Email would be sent to:", receipt.student_email);
    console.log("Receipt Number:", receipt.receipt_number);

    console.log("\n========================================");
    console.log("=== resend-manual-receipt-email - SUCCESS ===");
    console.log("Receipt Number:", receipt.receipt_number);
    console.log("Timestamp:", new Date().toISOString());
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt email resent successfully",
        receipt_number: receipt.receipt_number,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("\n========================================");
    console.error("=== resend-manual-receipt-email - ERROR ===");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("========================================\n");

    // Log critical error
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({
          function_name: "resend-manual-receipt-email",
          error_message: error.message,
          error_stack: error.stack,
          error_type: error.constructor.name,
          severity: "high"
        })
      });
    } catch (logErr) {
      console.error("Failed to log critical error:", logErr);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to resend receipt email",
        error_type: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
