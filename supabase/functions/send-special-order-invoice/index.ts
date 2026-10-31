
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customer_name, customer_email, invoice_id, total_amount, order_details, app_url } = await req.json();
    
    // 1. Generate Token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    // 2. Store Token
    const { error: dbError } = await supabase
      .from('payment_tokens')
      .insert({
        invoice_id: invoice_id,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (dbError) throw dbError;

    // 3. Construct Links
    const baseUrl = app_url || 'http://localhost:3000'; // Fallback
    const paymentLink = `${baseUrl}/special-order-payment?invoice_id=${invoice_id}&token=${token}`;
    const signupLink = `${baseUrl}/signup?email=${encodeURIComponent(customer_email)}&invoice_id=${invoice_id}`;

    // 4. Configure SMTP
    const client = new SmtpClient();
    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    const FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") || "orders@arbiecupcake.com";

    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASSWORD,
    });

    // 5. Send Email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #db2777; text-align: center;">Special Order Invoice</h2>
        <p>Dear ${customer_name},</p>
        <p>Your special order has been reviewed and approved! Here are the details:</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
          <p><strong>Order Details:</strong> ${order_details}</p>
          <p><strong>Total Amount:</strong> <span style="font-size: 1.2em; font-weight: bold; color: #db2777;">GH₵${total_amount}</span></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentLink}" style="background-color: #db2777; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Pay Now</a>
        </div>

        <p style="text-align: center;">or copy this link: <br/><a href="${paymentLink}">${paymentLink}</a></p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <div style="text-align: center;">
          <p>Want to track this order easily?</p>
          <a href="${signupLink}" style="color: #4f46e5; text-decoration: none; font-weight: bold;">Create an Account</a>
        </div>
      </div>
    `;

    await client.send({
      from: FROM_EMAIL,
      to: customer_email,
      subject: `Invoice for your Special Order - GH₵${total_amount}`,
      content: emailContent,
      html: emailContent,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Invoice Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
