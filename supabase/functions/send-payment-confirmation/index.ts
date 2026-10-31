
import { corsHeaders } from "./cors.ts";
import { createTransport } from "npm:nodemailer@6.9.7";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, customerName, customerEmail, totalAmount } = await req.json();
    
    // 1. Fetch SMTP Settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      console.error("SMTP Settings missing or error:", smtpError);
      throw new Error("SMTP configuration not found.");
    }

    console.log(`Payment Email: Connecting to SMTP: ${smtpSettings.host}:${smtpSettings.port}`);

    // 2. Create Transporter
    const transporter = createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.port === 465,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      tls: {
        rejectUnauthorized: false 
      }
    });
    
    // Verify connection
    await new Promise((resolve, reject) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error("SMTP Verify Error:", error);
          reject(error);
        } else {
          resolve(success);
        }
      });
    });

    // 3. Construct HTML
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
           <h2 style="color: #059669;">Payment Received!</h2>
        </div>
        
        <p>Hi ${customerName},</p>
        <p>Good news! We have received your payment of <strong>GH₵${totalAmount.toFixed(2)}</strong> for Order <strong>#${orderId}</strong>.</p>
        
        <p>Your order is now being processed by our baking team.</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>What happens next?</strong>
          <ul style="margin-bottom: 0;">
            <li>Our bakers will start working on your delicious treats.</li>
            <li>We will contact you shortly regarding delivery arrangements.</li>
          </ul>
        </div>

        <p>Thank you for choosing ArbiecupCake!</p>
      </div>
    `;

    // 4. Send Email
    const info = await transporter.sendMail({
      from: `"${smtpSettings.from_name}" <${smtpSettings.from_email}>`,
      to: customerEmail,
      subject: `Payment Received - Order #${orderId}`,
      html: htmlContent,
    });

    console.log("Payment confirmation sent: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Email Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
