
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface Registration {
  id: string;
  full_name: string;
  email: string;
  package_title: string;
  package_price: number;
  invoice_number: string;
  google_meet_link: string;
  meeting_scheduled_at: string;
  training_mode: string;
}

async function getUpcomingTrainings(): Promise<Registration[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/training_registrations?training_mode=eq.Online&meeting_scheduled_at=gte.${tomorrow.toISOString()}&meeting_scheduled_at=lt.${dayAfterTomorrow.toISOString()}&payment_status=eq.Paid&select=*`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch upcoming trainings');
  }

  return await response.json();
}

async function sendReminderEmail(registration: Registration): Promise<void> {
  const invokeResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-training-invoice-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: registration.full_name,
      email: registration.email,
      package_title: registration.package_title,
      package_price: registration.package_price,
      invoice_number: registration.invoice_number,
      checkout_link: '', // Not needed for reminder
      registration_id: registration.id,
      email_type: 'reminder',
      google_meet_link: registration.google_meet_link,
      meeting_scheduled_at: registration.meeting_scheduled_at,
      training_mode: registration.training_mode
    })
  });

  if (!invokeResponse.ok) {
    const errorText = await invokeResponse.text();
    throw new Error(`Failed to send reminder email: ${errorText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const upcomingTrainings = await getUpcomingTrainings();

    const results = {
      total: upcomingTrainings.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const training of upcomingTrainings) {
      if (!training.google_meet_link) {
        results.errors.push(`No Google Meet link for ${training.full_name}`);
        results.failed++;
        continue;
      }

      try {
        await sendReminderEmail(training);
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send to ${training.email}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.sent} reminders, ${results.failed} failed`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Reminder job failed:', error);

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
