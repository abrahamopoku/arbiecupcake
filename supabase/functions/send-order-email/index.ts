
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import nodemailer from "npm:nodemailer@6.9.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    console.log("📨 Received email request:", JSON.stringify(reqBody, null, 2));

    const { orderId, orderType = 'regular' } = reqBody;

    if (!orderId) {
      console.error("❌ Error: Missing orderId in request body");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing orderId in request body" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 0. Fetch SMTP Settings from Database
    console.log("🔌 Fetching SMTP configuration...");
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (smtpError) {
        console.error("❌ Database Error fetching SMTP settings:", smtpError);
        throw new Error("Failed to retrieve SMTP configuration");
    }

    if (!smtpSettings) {
        console.error("❌ No active SMTP settings found in database.");
        throw new Error("SMTP settings not configured in database.");
    }

    console.log(`✅ SMTP Config found: ${smtpSettings.host}:${smtpSettings.port} (${smtpSettings.from_email})`);

    // 1. Fetch Order Details
    console.log(`🔍 Fetching order details for ID: ${orderId}`);
    
    // First try fetching by UUID (id)
    let { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
       console.log(`⚠️ Fetch by ID failed or returned null (Error: ${orderError?.message}). Retrying with order_number...`);
       
       // Fallback: Try fetching by order_number (string)
       const { data: orderByNum, error: numError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderId)
        .single();
        
       if (numError || !orderByNum) {
         console.error(`❌ Order not found by ID or Order Number: ${orderId}`);
         console.error("Query Error:", numError);
         
         return new Response(JSON.stringify({ 
           success: false, 
           error: `Order not found with ID/Number: ${orderId}`,
           details: { idError: orderError?.message, numError: numError?.message }
         }), {
           status: 404,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
         });
       }
       
       order = orderByNum;
    }

    // Validate critical fields
    if (!order.customer_email) {
      console.error(`❌ Order found (${order.id}) but has no customer_email.`);
      return new Response(JSON.stringify({ success: false, error: "Order has no customer email address" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ Order found:", { id: order.id, number: order.order_number, email: order.customer_email });

    // 2. Fetch Admin Emails
    const { data: admins, error: adminError } = await supabase
      .from('arbie')
      .select('email');

    const adminEmails = admins?.map((a: any) => a.email).filter(Boolean) || [];
    if (adminError) console.error("⚠️ Failed to fetch admin emails:", adminError);

    // 3. Configure Nodemailer Transporter using DB Settings
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.port === 465, 
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
    });

    // 4. Construct Email Content
    // Handle potential null/undefined fields safely
    const safeDate = order.created_at ? new Date(order.created_at).toLocaleString('en-GH', { timeZone: 'Africa/Accra' }) : 'N/A';
    const safeTotal = typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : order.total_amount || '0.00';
    const safeItems = Array.isArray(order.order_items) ? order.order_items : [];

    let subject = "";
    let htmlContent = "";

    // Common Styles
    const style = `
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; }
      .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
      .header { background: #fdf2f8; padding: 20px; text-align: center; border-bottom: 3px solid #db2777; }
      .header h1 { margin: 0; color: #db2777; font-size: 24px; }
      .content { padding: 30px 20px; background: #fff; }
      .section { margin-bottom: 25px; }
      .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 5px; }
      .value { font-size: 16px; color: #1f2937; }
      .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .table th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; color: #666; font-size: 14px; }
      .table td { border-bottom: 1px solid #eee; padding: 10px; font-size: 14px; }
      .total { text-align: right; font-size: 18px; font-weight: bold; color: #db2777; padding-top: 15px; }
      .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af; }
      .btn { display: inline-block; background: #db2777; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
    `;

    if (orderType === 'special' || order.order_status === 'special_request') {
      subject = `✨ Special Order Request - ${order.customer_name} (#${order.order_number})`;
      
      const itemsHtml = safeItems.length > 0 ? safeItems.map((item: any) => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
          <strong style="font-size: 16px;">${item.name || 'Custom Item'}</strong>
          ${item.customizations ? `
            <div style="margin-top: 8px; font-size: 14px; color: #555;">
              ${Object.entries(item.customizations)
                .filter(([k]) => k !== 'images') 
                .map(([k, v]) => `<div><strong style="text-transform:capitalize">${k.replace('_', ' ')}:</strong> ${v}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('') : '<p>No specific items listed.</p>';

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${style}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Special Order Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${order.customer_name}</strong>,</p>
              <p>We have received your special request! Our team is reviewing the details and will contact you shortly to confirm the price and design.</p>
              
              <div class="section" style="background: #fffbe6; border: 1px solid #ffe58f; padding: 15px; border-radius: 6px;">
                <div class="label">Reference Number</div>
                <div class="value" style="font-family: monospace; font-size: 18px;">${order.order_number}</div>
              </div>

              <div class="section">
                <div class="label">Request Details</div>
                ${itemsHtml}
              </div>

              <div class="section">
                <div class="label">Customer Contact</div>
                <div class="value">${order.customer_phone || 'N/A'}</div>
                <div class="value">${order.customer_email}</div>
              </div>
              
              <p style="text-align: center;">
                <a href="${Deno.env.get("SITE_URL") || "https://arbiecupcake.com"}" class="btn">Return to Website</a>
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} ArbiecupCake. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Regular Order
      subject = `🛒 Order Confirmed - ${order.customer_name} (#${order.order_number})`;
      
      const itemsRows = safeItems.length > 0 ? safeItems.map((item: any) => `
        <tr>
          <td>
            <strong>${item.name || 'Unknown Item'}</strong>
            ${item.customizations ? `<div style="font-size: 12px; color: #888;">${Object.entries(item.customizations).map(([k,v]) => `${k}: ${v}`).join(', ')}</div>` : ''}
          </td>
          <td style="text-align: center;">${item.quantity || 1}</td>
          <td style="text-align: right;">GH₵${item.price || 0}</td>
        </tr>
      `).join('') : '<tr><td colspan="3">No items found</td></tr>';

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><style>${style}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${order.customer_name}</strong>,</p>
              <p>Thank you for your order! We are getting everything ready. Here are your order details:</p>
              
              <div class="section" style="display: flex; justify-content: space-between; background: #f3f4f6; padding: 15px; border-radius: 6px;">
                <div>
                  <div class="label">Order Number</div>
                  <div class="value">#${order.order_number}</div>
                </div>
                <div style="text-align: right;">
                  <div class="label">Date</div>
                  <div class="value">${safeDate}</div>
                </div>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
              
              <div class="total">
                Total: GH₵${safeTotal}
              </div>

              <div class="section" style="margin-top: 25px;">
                <div class="label">Delivery Address</div>
                <div class="value">${order.delivery_address || 'Pickup / Digital'}</div>
              </div>
              
              <div class="section">
                <div class="label">Payment Status</div>
                <div class="value" style="color: ${order.payment_status === 'paid' ? '#16a34a' : '#ea580c'}; font-weight: bold; text-transform: uppercase;">
                  ${order.payment_status || 'Pending'}
                </div>
              </div>
            </div>
            <div class="footer">
              Questions? Call us at 0543653254<br/>
              &copy; ${new Date().getFullYear()} ArbiecupCake.
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // 5. Send Emails
    
    // To Customer
    console.log(`📤 Sending email to customer: ${order.customer_email}`);
    await transporter.sendMail({
      from: `"${smtpSettings.from_name}" <${smtpSettings.from_email}>`,
      to: order.customer_email,
      subject: subject,
      html: htmlContent,
    });

    // To Admins
    if (adminEmails.length > 0) {
      console.log(`📤 Sending admin notification to: ${adminEmails.length} admins`);
      await transporter.sendMail({
        from: `"${smtpSettings.from_name} System" <${smtpSettings.from_email}>`,
        to: adminEmails.join(', '),
        subject: `[ADMIN ALERT] ${subject}`,
        html: `<div style="background:#fff3cd; padding:10px; text-align:center; font-weight:bold; color:#856404; border-bottom:1px solid #ffeeba;">ADMIN NOTIFICATION COPY</div>` + htmlContent,
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Emails sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("❌ Fatal Error in send-order-email:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || "Internal Server Error",
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
