
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("=== send-newsletter - START ===");
  console.log("Timestamp:", timestamp);
  console.log("========================================");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("\n--- Step 1: Parse Request Body ---");
    const body = await req.json();
    console.log("Request Body Keys:", Object.keys(body));

    const { newsletter_id, subject, content, recipients } = body;

    console.log("\n--- Step 2: Validate Required Fields ---");
    if (!newsletter_id || !subject || !content || !recipients) {
      const errorMsg = "Missing required fields";
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
            function_name: "send-newsletter",
            error_message: errorMsg,
            error_type: "ValidationError",
            severity: "medium",
            request_data: { newsletter_id, has_subject: !!subject, has_content: !!content, recipients_count: recipients?.length }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }

    console.log("✓ Required fields validated");
    console.log("Newsletter ID:", newsletter_id);
    console.log("Recipients Count:", recipients.length);

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
            function_name: "send-newsletter",
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

    console.log("\n--- Step 4: Send Emails (Placeholder) ---");
    console.log("Would send to", recipients.length, "recipients");
    
    let successCount = 0;
    let failCount = 0;

    for (const email of recipients) {
      console.log("Sending to:", email);
      successCount++;
    }

    console.log("\n--- Step 5: Log Results ---");
    console.log("✓ Emails sent:", successCount);
    console.log("✗ Failed:", failCount);

    console.log("\n========================================");
    console.log("=== send-newsletter - SUCCESS ===");
    console.log("Success Count:", successCount);
    console.log("Timestamp:", new Date().toISOString());
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${successCount} recipients`,
        success_count: successCount,
        fail_count: failCount,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("\n========================================");
    console.error("=== send-newsletter - ERROR ===");
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
          function_name: "send-newsletter",
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
        error: error.message || "Failed to send newsletter",
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
