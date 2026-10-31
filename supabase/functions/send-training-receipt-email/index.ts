
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      student_email,
      student_name,
      receipt_number,
      receipt_html,
      course_name,
      amount
    } = await req.json();

    // Validation
    if (!student_email || !student_name || !receipt_number || !receipt_html) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch SMTP settings from system_settings table
    const { data: smtpData, error: smtpError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "smtp_config")
      .maybeSingle();

    if (smtpError || !smtpData) {
      console.error("SMTP configuration not found:", smtpError);
      return new Response(
        JSON.stringify({ success: false, error: "SMTP configuration not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const smtpConfig = smtpData.value;

    // Create professional email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .email-container {
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .email-header {
              background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .email-header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .email-body {
              padding: 30px 20px;
            }
            .greeting {
              font-size: 18px;
              color: #1e293b;
              margin-bottom: 15px;
            }
            .message {
              font-size: 15px;
              color: #475569;
              margin-bottom: 25px;
              line-height: 1.7;
            }
            .receipt-wrapper {
              margin: 30px 0;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
            }
            .email-footer {
              background: #f8fafc;
              padding: 25px 20px;
              text-align: center;
              border-top: 2px solid #e2e8f0;
              font-size: 13px;
              color: #64748b;
            }
            .email-footer strong {
              color: #ec4899;
              font-size: 16px;
              display: block;
              margin-bottom: 8px;
            }
            .email-footer p {
              margin: 5px 0;
            }
            @media only screen and (max-width: 600px) {
              body { padding: 10px; }
              .email-body { padding: 20px 15px; }
              .email-header h1 { font-size: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>🧾 Payment Receipt</h1>
            </div>
            
            <div class="email-body">
              <p class="greeting">Hi ${student_name},</p>
              
              <p class="message">
                Thank you for your payment! Your receipt for <strong>${course_name}</strong> training is ready.
                <br><br>
                <strong>Receipt Number:</strong> ${receipt_number}<br>
                <strong>Amount Paid:</strong> GH₵ ${parseFloat(amount).toFixed(2)}
                <br><br>
                Please find your official receipt below. You can save or print this for your records.
              </p>
              
              <div class="receipt-wrapper">
                ${receipt_html}
              </div>
              
              <p class="message">
                If you have any questions about your receipt or training, please don't hesitate to contact us.
                <br><br>
                We look forward to seeing you in class!
              </p>
            </div>
            
            <div class="email-footer">
              <strong>ArbiecupCake</strong>
              <p>Premium Cakes & Pastries Training Academy</p>
              <p>Email: info@arbiecupcake.com | Phone: +233 XX XXX XXXX</p>
              <p>&copy; ${new Date().getFullYear()} ArbiecupCake. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API (SMTP alternative for edge functions)
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`
      },
      body: JSON.stringify({
        from: `ArbiecupCake <${smtpConfig.from_email || "noreply@arbiecupcake.com"}>`,
        to: student_email,
        subject: `Payment Receipt - ${receipt_number} | ArbiecupCake Training`,
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email sending failed:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send receipt email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Receipt email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-training-receipt-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
