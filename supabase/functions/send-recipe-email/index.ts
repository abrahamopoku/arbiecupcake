
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
    const { recipe_id, recipe_title, recipe_content, customer_email, customer_name } = await req.json();

    if (!recipe_title || !recipe_content || !customer_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "smtp_config")
      .maybeSingle();

    if (smtpError || !smtpData) {
      return new Response(
        JSON.stringify({ success: false, error: "SMTP configuration not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const smtpConfig = smtpData.value;

    // Create HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #ec4899; border-bottom: 3px solid #ec4899; padding-bottom: 10px; }
            h2 { color: #64748b; margin-top: 30px; }
            .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
            pre { white-space: pre-wrap; word-wrap: break-word; background: #fff; padding: 15px; border-left: 4px solid #ec4899; }
            @media only screen and (max-width: 600px) {
              body { padding: 10px; }
              .section { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <h1>🍰 ${recipe_title}</h1>
          <p>Hi ${customer_name || "Valued Customer"},</p>
          <p>Thank you for your interest in this recipe! Here's your complete recipe guide:</p>
          
          <div class="section">
            <pre>${recipe_content}</pre>
          </div>
          
          <div class="footer">
            <p><strong>ArbiecupCake</strong></p>
            <p>Premium Cakes & Pastries</p>
            <p>Email: info@arbiecupcake.com | Phone: +233 XX XXX XXXX</p>
            <p>&copy; ${new Date().getFullYear()} ArbiecupCake. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Send email using fetch to SMTP API (nodemailer alternative for Deno)
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`
      },
      body: JSON.stringify({
        from: `ArbiecupCake <${smtpConfig.from_email || "noreply@arbiecupcake.com"}>`,
        to: customer_email,
        subject: `Your Recipe: ${recipe_title}`,
        html: htmlContent
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email sending failed:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Log share activity
    if (recipe_id) {
      await supabase.from("recipe_shares").insert({
        recipe_id,
        customer_email,
        share_type: "email"
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Recipe email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-recipe-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
