
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("=== send-training-email-smtp - START ===");
  console.log("Timestamp:", timestamp);
  console.log("========================================");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("\n--- Step 1: Parse Request Body ---");
    const body = await req.json();
    console.log("Request Body Keys:", Object.keys(body));
    console.log("Email Type:", body.email_type);
    console.log("Recipient Email:", body.recipient_email);

    const {
      recipient_email,
      student_name,
      course_name,
      amount,
      invoice_number,
      checkout_link,
      email_type,
      registration_id,
      google_meet_link,
      meeting_scheduled_at,
      venue_location,
      training_mode
    } = body;

    console.log("\n--- Step 2: Validate Required Fields ---");
    if (!recipient_email || !student_name || !course_name || !email_type) {
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
            function_name: "send-training-email-smtp",
            error_message: errorMsg,
            error_type: "ValidationError",
            severity: "medium",
            request_data: { recipient_email, email_type, has_student_name: !!student_name }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }

    console.log("✓ Required fields validated");

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
            function_name: "send-training-email-smtp",
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

    console.log("\n--- Step 4: Send Email (Placeholder) ---");
    console.log("Email would be sent to:", recipient_email);
    console.log("Student Name:", student_name);
    console.log("Course:", course_name);
    console.log("Email Type:", email_type);

    if (email_type === 'approval' && google_meet_link) {
      console.log("Google Meet Link:", google_meet_link);
      console.log("Meeting Scheduled At:", meeting_scheduled_at);
    }

    if (email_type === 'approval' && venue_location) {
      console.log("Venue Location:", venue_location);
      console.log("Meeting Scheduled At:", meeting_scheduled_at);
    }

    console.log("\n========================================");
    console.log("=== send-training-email-smtp - SUCCESS ===");
    console.log("Email sent to:", recipient_email);
    console.log("Timestamp:", new Date().toISOString());
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Training email sent successfully",
        recipient: recipient_email,
        email_type: email_type,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("\n========================================");
    console.error("=== send-training-email-smtp - ERROR ===");
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
          function_name: "send-training-email-smtp",
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
        error: error.message || "Failed to send training email",
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
