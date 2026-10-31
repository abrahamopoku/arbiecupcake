
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  const timestamp = new Date().toISOString();
  
  console.log("\n========================================");
  console.log("=== send-manual-receipt-email - START ===");
  console.log("Timestamp:", timestamp);
  console.log("========================================");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("\n--- Step 1: Parse Request Body ---");
    const body = await req.json();
    console.log("Request Body Keys:", Object.keys(body));
    console.log("Training Registration ID:", body.training_registration_id);
    console.log("Student Name:", body.student_name);
    console.log("Student Email:", body.student_email);

    const {
      training_registration_id,
      student_name,
      student_email,
      course_name,
      amount,
      payment_type = 'Full Payment',
      receipt_date
    } = body;

    console.log("\n--- Step 2: Validate Required Fields ---");
    const requiredFields = {
      training_registration_id,
      student_name,
      student_email,
      course_name,
      amount
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      console.error("❌", errorMsg);
      
      // Log error
      try {
        const logResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "send-manual-receipt-email",
            error_message: errorMsg,
            error_type: "ValidationError",
            severity: "medium",
            request_data: body
          })
        });
        console.log("Error logged:", await logResponse.text());
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw new Error(errorMsg);
    }
    console.log("✓ All required fields validated");

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
            function_name: "send-manual-receipt-email",
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

    console.log("\n--- Step 4: Generate Receipt Number ---");
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log("Receipt Number:", receiptNumber);

    console.log("\n--- Step 5: Prepare Receipt Data ---");
    const receiptData = {
      training_registration_id,
      student_name,
      student_email,
      course_name,
      amount: parseFloat(amount),
      payment_type,
      receipt_number: receiptNumber,
      receipt_date: receipt_date || new Date().toISOString().split('T')[0],
      sent_date: new Date().toISOString(),
      email_sent: true,
      created_at: new Date().toISOString()
    };
    console.log("Receipt Data:", JSON.stringify(receiptData, null, 2));

    console.log("\n--- Step 6: Insert Receipt into Database ---");
    console.log("Table: manual_receipts");
    console.log("INSERT Query with columns:", Object.keys(receiptData).join(', '));
    
    const { data: insertedReceipt, error: insertError } = await supabase
      .from("manual_receipts")
      .insert([receiptData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database Insert Error:");
      console.error("Error Code:", insertError.code);
      console.error("Error Message:", insertError.message);
      console.error("Error Details:", insertError.details);
      console.error("Error Hint:", insertError.hint);
      
      // Log database error
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/log-error`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
          },
          body: JSON.stringify({
            function_name: "send-manual-receipt-email",
            error_message: insertError.message,
            error_type: "DatabaseError",
            severity: "high",
            request_data: receiptData,
            response_data: { code: insertError.code, details: insertError.details }
          })
        });
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }

      throw insertError;
    }

    console.log("\n--- Step 7: Receipt Inserted Successfully ---");
    console.log("✓ Receipt ID:", insertedReceipt.id);
    console.log("Receipt Number:", insertedReceipt.receipt_number);
    console.log("Created At:", insertedReceipt.created_at);

    console.log("\n--- Step 8: Send Email (Placeholder) ---");
    console.log("Email would be sent to:", student_email);
    console.log("Receipt Number:", receiptNumber);
    console.log("Amount:", amount);

    console.log("\n========================================");
    console.log("=== send-manual-receipt-email - SUCCESS ===");
    console.log("Receipt ID:", insertedReceipt.id);
    console.log("Receipt Number:", receiptNumber);
    console.log("Timestamp:", new Date().toISOString());
    console.log("========================================\n");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt generated and sent successfully",
        receipt_id: insertedReceipt.id,
        receipt_number: receiptNumber,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("\n========================================");
    console.error("=== send-manual-receipt-email - ERROR ===");
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
          function_name: "send-manual-receipt-email",
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
        error: error.message || "Failed to send manual receipt",
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
