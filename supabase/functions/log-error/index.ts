
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("=== log-error Edge Function - START ===");
  console.log("Timestamp:", timestamp);
  console.log("========================================");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("\n--- Step 1: Parse Request Body ---");
    const body = await req.json();
    console.log("Request Body:", JSON.stringify(body, null, 2));

    const {
      function_name,
      error_message,
      error_stack,
      error_type,
      user_id,
      user_email,
      request_data,
      response_data,
      status_code,
      severity = 'medium'
    } = body;

    console.log("\n--- Step 2: Validate Required Fields ---");
    if (!function_name) {
      console.error("❌ Missing required field: function_name");
      throw new Error("function_name is required");
    }
    if (!error_message) {
      console.error("❌ Missing required field: error_message");
      throw new Error("error_message is required");
    }
    console.log("✓ Required fields validated");

    console.log("\n--- Step 3: Initialize Supabase Client ---");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase credentials");
      throw new Error("Supabase credentials not configured");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✓ Supabase client initialized");

    console.log("\n--- Step 4: Prepare Error Log Data ---");
    const errorLogData = {
      function_name,
      error_message,
      error_stack: error_stack || null,
      error_type: error_type || 'UnknownError',
      user_id: user_id || null,
      user_email: user_email || null,
      request_data: request_data || null,
      response_data: response_data || null,
      status_code: status_code || null,
      severity: severity || 'medium',
      resolved: false,
      created_at: new Date().toISOString()
    };
    console.log("Error Log Data:", JSON.stringify(errorLogData, null, 2));

    console.log("\n--- Step 5: Insert Error Log into Database ---");
    const { data, error: insertError } = await supabase
      .from("error_logs")
      .insert([errorLogData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database Insert Error:");
      console.error("Error Code:", insertError.code);
      console.error("Error Message:", insertError.message);
      console.error("Error Details:", insertError.details);
      throw insertError;
    }

    console.log("\n--- Step 6: Insert Success ---");
    console.log("✓ Error log inserted successfully");
    console.log("Error Log ID:", data.id);
    console.log("Created At:", data.created_at);

    console.log("\n========================================");
    console.log("=== log-error Edge Function - SUCCESS ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Error logged successfully",
        error_log_id: data.id,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("\n========================================");
    console.error("=== log-error Edge Function - ERROR ===");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("========================================\n");

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to log error",
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
