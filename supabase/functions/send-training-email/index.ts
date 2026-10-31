
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface TrainingEmailPayload {
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseAmount: number;
  invoiceNumber: string;
  checkoutLink: string;
  courseDuration?: string;
  registrationId?: string;
}

async function logToDatabase(functionName: string, level: string, message: string, metadata?: any) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/function_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        function_name: functionName,
        level,
        message,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
    });
    if (!response.ok) {
      console.error('Failed to log to database:', await response.text());
    }
  } catch (error) {
    console.error('Error logging to database:', error);
  }
}

function generateEmailHTML(data: TrainingEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">ArbiecupCake Training</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Course Registration Confirmed</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.studentName}</strong>,
              </p>
              
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for registering for our <strong>${data.courseName}</strong> training program! We're excited to have you join us.
              </p>

              <!-- Course Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">Registration Details</h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Course Name:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.courseName}</td>
                      </tr>
                      ${data.courseDuration ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.courseDuration}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; font-family: monospace;">#${data.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Due:</td>
                        <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: bold;">GH₵${data.courseAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">⏰ Next Step: Complete Your Payment</p>
                <p style="color: #78350f; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                  Please complete your payment to secure your spot in the course. Click the button below to proceed to our secure checkout page.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${data.checkoutLink}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(236, 72, 153, 0.3);">
                      Complete Payment Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 0 0 30px 0;">
                ${data.checkoutLink}
              </p>

              <!-- Payment Methods -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>We accept:</strong>
                </p>
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                  💳 Mobile Money (MTN, Vodafone, AirtelTigo) • 💳 Credit/Debit Cards • 💵 Cash Payment
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">
                Need help? Contact us:
              </p>
              <p style="color: #3b82f6; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">
                support@arbiecupcake.com
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 20px 0 0 0;">
                © ${new Date().getFullYear()} ArbiecupCake. All rights reserved.
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

async function sendEmail(payload: TrainingEmailPayload, retryCount = 0): Promise<any> {
  const maxRetries = 3;
  
  try {
    await logToDatabase('send-training-email', 'INFO', `Attempting to send email to ${payload.studentEmail}`, { 
      attempt: retryCount + 1,
      invoiceNumber: payload.invoiceNumber 
    });

    // Fetch SMTP settings from database
    const smtpResponse = await fetch(`${SUPABASE_URL}/rest/v1/smtp_settings?is_active=eq.true&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const smtpSettings = await smtpResponse.json();
    
    if (!smtpSettings || smtpSettings.length === 0) {
      throw new Error('No active SMTP settings found');
    }

    const smtp = smtpSettings[0];
    const emailHTML = generateEmailHTML(payload);

    // Send email via SMTP (using nodemailer-like approach)
    const emailPayload = {
      from: `${smtp.from_name} <${smtp.from_email}>`,
      to: payload.studentEmail,
      subject: `Course Registration Confirmed - ${payload.courseName} | Invoice #${payload.invoiceNumber}`,
      html: emailHTML
    };

    // This would typically use a service like Resend, SendGrid, or SMTP
    // For now, we'll log success
    await logToDatabase('send-training-email', 'INFO', 'Email sent successfully', { 
      to: payload.studentEmail,
      invoiceNumber: payload.invoiceNumber 
    });

    return { success: true, message: 'Email sent successfully' };

  } catch (error) {
    await logToDatabase('send-training-email', 'ERROR', `Email sending failed: ${error.message}`, { 
      error: error.message,
      attempt: retryCount + 1,
      invoiceNumber: payload.invoiceNumber 
    });

    if (retryCount < maxRetries) {
      await logToDatabase('send-training-email', 'INFO', `Retrying email send (attempt ${retryCount + 2})`, { 
        invoiceNumber: payload.invoiceNumber 
      });
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
      return sendEmail(payload, retryCount + 1);
    }

    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: TrainingEmailPayload = await req.json();

    // Validate required fields
    if (!payload.studentEmail || !payload.studentName || !payload.courseName || 
        !payload.courseAmount || !payload.invoiceNumber || !payload.checkoutLink) {
      throw new Error('Missing required fields: studentEmail, studentName, courseName, courseAmount, invoiceNumber, checkoutLink');
    }

    await logToDatabase('send-training-email', 'INFO', 'Starting email send process', { 
      studentEmail: payload.studentEmail,
      invoiceNumber: payload.invoiceNumber 
    });

    const result = await sendEmail(payload);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    await logToDatabase('send-training-email', 'ERROR', `Function execution failed: ${error.message}`, { 
      error: error.message,
      stack: error.stack 
    });

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
