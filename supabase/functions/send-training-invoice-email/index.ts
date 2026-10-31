
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface EmailPayload {
  full_name: string;
  email: string;
  package_title: string;
  package_price: number;
  invoice_number: string;
  checkout_link: string;
  registration_id?: string;
  email_type?: 'registration' | 'approval' | 'payment_confirmation' | 'reminder';
  google_meet_link?: string;
  meeting_scheduled_at?: string;
  venue_location?: string;
  training_mode?: 'Online' | 'In-Person';
}

async function logEmailAttempt(
  registrationId: string | undefined,
  emailType: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' | 'pending',
  errorMessage?: string
) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        training_registration_id: registrationId || null,
        email_type: emailType,
        recipient_email: recipientEmail,
        subject,
        status,
        error_message: errorMessage || null,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Failed to log email attempt:', await response.text());
    }
  } catch (error) {
    console.error('Error logging email attempt:', error);
  }
}

function generateRegistrationEmailHTML(data: EmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Registration Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">ArbiecupCake Training</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Course Registration Invoice</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.full_name}</strong>,
              </p>
              
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for registering for <strong>${data.package_title}</strong>! We've received your registration and created an invoice for you.
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">Invoice Details</h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">Invoice Number:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; font-family: monospace;">#${data.invoice_number}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Course:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.package_title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Due:</td>
                        <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: bold;">GH₵${data.package_price.toFixed(2)}</td>
                      </tr>
                      ${data.training_mode ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Training Mode:</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${data.training_mode}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">⏰ Next Step: Complete Your Payment</p>
                <p style="color: #78350f; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                  Click the button below to proceed to our secure checkout page and complete your payment.
                </p>
              </div>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${data.checkout_link}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(236, 72, 153, 0.3);">
                      Complete Payment Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin: 0 0 30px 0;">
                ${data.checkout_link}
              </p>
            </td>
          </tr>

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

function generateApprovalEmailHTML(data: EmailPayload): string {
  const isOnline = data.training_mode === 'Online';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Approved - Class Details</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #10b981; font-size: 32px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Registration Approved!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your training is confirmed</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${data.full_name}</strong>,
              </p>
              
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Great news! Your registration for <strong>${data.package_title}</strong> has been approved. ${isOnline ? 'Your online class is ready!' : 'Here are the venue details for your in-person training.'}
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="color: #065f46; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">Class Details</h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px; width: 40%;">Course:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${data.package_title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Training Mode:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${data.training_mode}</td>
                      </tr>
                      ${data.meeting_scheduled_at ? `
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Scheduled For:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${new Date(data.meeting_scheduled_at).toLocaleString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                      </tr>
                      ` : ''}
                      ${isOnline && data.google_meet_link ? `
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Google Meet Link:</td>
                        <td style="padding: 8px 0;">
                          <a href="${data.google_meet_link}" style="color: #3b82f6; font-size: 14px; font-weight: 600; text-decoration: underline;">${data.google_meet_link}</a>
                        </td>
                      </tr>
                      ` : ''}
                      ${!isOnline && data.venue_location ? `
                      <tr>
                        <td style="padding: 8px 0; color: #047857; font-size: 14px;">Venue:</td>
                        <td style="padding: 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">${data.venue_location}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${isOnline && data.google_meet_link ? `
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 600;">💻 How to Join</p>
                <p style="color: #1e3a8a; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                  Click the Google Meet link above at the scheduled time. Make sure you have a stable internet connection and your camera/microphone ready.
                </p>
              </div>
              ` : ''}

              ${!isOnline ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">📍 Venue Information</p>
                <p style="color: #78350f; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                  Please arrive 15 minutes early. Bring your payment confirmation and a notepad.
                </p>
              </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                We're excited to have you! If you have any questions, feel free to reach out.
              </p>
            </td>
          </tr>

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

function generateReminderEmailHTML(data: EmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Reminder - Tomorrow!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 90%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">⏰ Class Reminder</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your training starts soon!</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${data.full_name}</strong>,
              </p>
              
              <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This is a friendly reminder that your <strong>${data.package_title}</strong> class is scheduled for tomorrow!
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fff7ed; border: 2px solid #f59e0b; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="color: #78350f; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">Class Details</h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${data.meeting_scheduled_at ? `
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 14px; width: 40%;">Date & Time:</td>
                        <td style="padding: 8px 0; color: #78350f; font-size: 14px; font-weight: 600;">${new Date(data.meeting_scheduled_at).toLocaleString('en-GB', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                      </tr>
                      ` : ''}
                      ${data.google_meet_link ? `
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-size: 14px;">Google Meet Link:</td>
                        <td style="padding: 8px 0;">
                          <a href="${data.google_meet_link}" style="color: #3b82f6; font-size: 14px; font-weight: 600; text-decoration: underline;">${data.google_meet_link}</a>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${data.google_meet_link || '#'}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Join Google Meet
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; font-weight: 600;">✅ Before You Join</p>
                <p style="color: #1e3a8a; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                  • Test your camera and microphone<br>
                  • Ensure stable internet connection<br>
                  • Have a notepad and pen ready<br>
                  • Join 5 minutes early
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                See you tomorrow! We're excited to have you in class.
              </p>
            </td>
          </tr>

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

async function sendEmailWithRetry(payload: EmailPayload, attempt = 1): Promise<any> {
  const maxRetries = 3;
  const emailType = payload.email_type || 'registration';
  
  try {
    let subject = '';
    let htmlContent = '';

    switch (emailType) {
      case 'registration':
        subject = `Course Registration Invoice - ${payload.package_title} | Invoice #${payload.invoice_number}`;
        htmlContent = generateRegistrationEmailHTML(payload);
        break;
      case 'approval':
        subject = `Training Approved - ${payload.package_title} | Class Details`;
        htmlContent = generateApprovalEmailHTML(payload);
        break;
      case 'reminder':
        subject = `⏰ Class Reminder: ${payload.package_title} - Tomorrow!`;
        htmlContent = generateReminderEmailHTML(payload);
        break;
      case 'payment_confirmation':
        subject = `Payment Confirmed - ${payload.package_title}`;
        htmlContent = generateRegistrationEmailHTML(payload); // Reuse template
        break;
      default:
        subject = `Training Update - ${payload.package_title}`;
        htmlContent = generateRegistrationEmailHTML(payload);
    }

    await logEmailAttempt(
      payload.registration_id,
      emailType,
      payload.email,
      subject,
      'pending'
    );

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ArbiecupCake Training <training@arbiecupcake.com>',
        to: [payload.email],
        subject,
        html: htmlContent
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const resendData = await resendResponse.json();

    await logEmailAttempt(
      payload.registration_id,
      emailType,
      payload.email,
      subject,
      'sent'
    );

    return { 
      success: true, 
      message: 'Email sent successfully',
      emailId: resendData.id
    };

  } catch (error) {
    console.error(`Email send attempt ${attempt} failed:`, error);

    await logEmailAttempt(
      payload.registration_id,
      emailType,
      payload.email,
      `Failed attempt ${attempt}`,
      'failed',
      error.message
    );

    if (attempt < maxRetries) {
      const delay = 2000 * attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmailWithRetry(payload, attempt + 1);
    }

    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.full_name || !payload.email || !payload.package_title || 
        !payload.package_price || !payload.invoice_number) {
      throw new Error('Missing required fields');
    }

    const result = await sendEmailWithRetry(payload);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Function execution failed:', error);

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
