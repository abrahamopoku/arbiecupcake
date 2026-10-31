
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import nodemailer from "npm:nodemailer@6.9.13";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, checkout_url, amount, customer_name, description } = await req.json();

    if (!email || !checkout_url) {
      return new Response(JSON.stringify({ error: "Email and Checkout URL are required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get SMTP Settings
    const { data: smtpSettings } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!smtpSettings) {
      return new Response(JSON.stringify({ error: "No active SMTP settings found" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.port === 465,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
    });

    // Send Email
    await transporter.sendMail({
      from: `"${smtpSettings.from_name || 'ArbiecupCake'}" <${smtpSettings.from_email}>`,
      to: email,
      subject: `Payment Request: GH₵${amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #db2777; text-align: center;">Payment Request</h2>
          <p>Hello ${customer_name || 'Customer'},</p>
          <p>You have received a payment request from ArbiecupCake.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
             <p style="margin: 5px 0;"><strong>Description:</strong> ${description || 'Custom Order Payment'}</p>
             <p style="margin: 5px 0;"><strong>Amount Due:</strong> <span style="font-size: 1.2em; color: #db2777;">GH₵${amount}</span></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
             <a href="${checkout_url}" style="background-color: #db2777; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
               Pay Now
             </a>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
             Link: <a href="${checkout_url}" style="color: #db2777;">${checkout_url}</a>
          </p>
        </div>
      `
    });

    return new Response(JSON.stringify({ success: true, message: "Email sent" }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Send Email Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
