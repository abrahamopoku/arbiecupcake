
import { corsHeaders } from "./cors.ts";
import { createTransport } from "npm:nodemailer@6.9.7";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface PaymentConfirmation {
  studentEmail: string;
  studentName: string;
  courseName: string;
  amount: number;
  invoiceNumber: string;
  transactionId: string;
  paymentMethod: string;
  training_mode?: string;
}

interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

async function fetchSMTPSettings(): Promise<SMTPSettings> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/smtp_settings?is_active=eq.true&limit=1`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch SMTP settings');
  }

  const data = await response.json();
  
  if (!data || data.length === 0) {
    throw new Error('No active SMTP configuration found');
  }

  return data[0];
}

function generateConfirmationEmailHTML(data: PaymentConfirmation, fromEmail: string): string {
  const paymentDate = new Date().toLocaleString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="background-color: #ffffff; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: #10b981; font-size: 48px; font-weight: bold;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Payment Successful!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your training registration is confirmed</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.studentName}</strong>,
              </p>
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for your payment! Your registration for <strong>${data.courseName}</strong> has been confirmed and processed successfully.
              </p>
              
              <!-- Payment Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="color: #065f46; font-size: 18px; margin: 0 0 16px 0; font-weight: bold;">Payment Confirmation</h2>
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px; width: 45%;">Transaction ID:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600; font-family: monospace;">${data.transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Invoice Number:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">#${data.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Payment Method:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Amount Paid:</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 18px; font-weight: bold;">GH₵${data.amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Payment Date:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${paymentDate}</td>
                      </tr>
                      ${data.training_mode ? `
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Training Mode:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${data.training_mode}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">📋 Next Steps</h3>
                <ul style="color: #1e3a8a; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>You will receive training schedule details within 24 hours</li>
                  <li>Check your email for Google Meet links (Online) or venue details (In-Person)</li>
                  <li>Prepare any questions you'd like to ask during the training</li>
                  <li>Keep this confirmation email for your records</li>
                </ul>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>📧 Important:</strong> Please check your spam/junk folder if you don't receive the training details email within 24 hours.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions or need assistance, please don't hesitate to contact us. We're excited to have you in our training program!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Need help? Contact us:
              </p>
              <p style="color: #3b82f6; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">
                ${fromEmail}
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0 0;">
                © ${new Date().getFullYear()} ArbiecupCake Academy. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
                This is an automated confirmation email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: PaymentConfirmation = await req.json();

    if (!payload.studentEmail || !payload.studentName || !payload.courseName || 
        !payload.amount || !payload.invoiceNumber || !payload.transactionId || 
        !payload.paymentMethod) {
      throw new Error('Missing required payment confirmation fields');
    }

    console.log('Sending payment confirmation to:', payload.studentEmail);

    const smtpSettings = await fetchSMTPSettings();

    const transporter = createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.port === 465,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
      tls: { rejectUnauthorized: false }
    });

    const htmlContent = generateConfirmationEmailHTML(payload, smtpSettings.from_email);

    const info = await transporter.sendMail({
      from: `"${smtpSettings.from_name}" <${smtpSettings.from_email}>`,
      to: payload.studentEmail,
      subject: `Payment Confirmed - ${payload.courseName} Registration`,
      html: htmlContent,
    });

    console.log("Payment confirmation email sent:", info.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment confirmation sent to ${payload.studentEmail}`,
        messageId: info.messageId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Email sending failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
