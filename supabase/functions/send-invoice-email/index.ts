
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
    const { order, items } = await req.json();

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

    console.log(`Invoice Email: Connecting to SMTP: ${smtpSettings.host}:${smtpSettings.port}`);

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

    // 3. Construct HTML Invoice
    const itemsRows = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">GH₵${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; border: 1px solid #eee; background-color: #fff;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
           <div>
             <h1 style="margin: 0; color: #333;">ArbiecupCake</h1>
             <p style="margin: 5px 0 0; color: #666; font-size: 0.9em;">Accra, Ghana<br>0543653254</p>
           </div>
           <div style="text-align: right;">
             <h2 style="margin: 0; color: #333;">INVOICE</h2>
             <p style="margin: 5px 0 0; color: #666;">#${order.order_number}</p>
             <p style="margin: 0; color: #666;">Date: ${new Date().toLocaleDateString()}</p>
           </div>
        </div>

        <div style="margin-bottom: 30px;">
           <strong>Bill To:</strong><br>
           ${order.customer_name}<br>
           ${order.customer_email}<br>
           ${order.customer_phone}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold;">Total Due:</td>
              <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 1.2em;">GH₵${order.total_amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="text-align: center; margin-top: 50px; font-size: 0.85em; color: #888;">
           <p>Thank you for your business!</p>
        </div>
      </div>
    `;

    // 4. Send Email
    const info = await transporter.sendMail({
      from: `"${smtpSettings.from_name}" <${smtpSettings.from_email}>`,
      to: order.customer_email,
      subject: `Invoice #${order.order_number} from ArbiecupCake`,
      html: htmlContent,
    });
    
    console.log("Invoice email sent: %s", info.messageId);

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
