
import { corsHeaders } from "./cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface MeetLinkPayload {
  student_name: string;
  course_name: string;
  training_date: string;
  training_time: string;
  student_email: string;
  registration_id?: string;
}

async function getGoogleCredentials() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/google_meet_credentials?limit=1&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google credentials');
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error('No Google credentials found. Please configure in admin settings.');
  }

  return data[0];
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      client_secret: GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function createGoogleMeetEvent(
  accessToken: string,
  payload: MeetLinkPayload
): Promise<any> {
  const startDateTime = new Date(`${payload.training_date}T${payload.training_time}`);
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  const event = {
    summary: `${payload.course_name} - Training Session`,
    description: `Training session for ${payload.student_name}. Course: ${payload.course_name}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Africa/Accra'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Africa/Accra'
    },
    attendees: [
      { email: payload.student_email }
    ],
    conferenceData: {
      createRequest: {
        requestId: `${payload.registration_id || 'training'}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error: ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: MeetLinkPayload = await req.json();

    if (!payload.student_name || !payload.course_name || !payload.training_date || 
        !payload.training_time || !payload.student_email) {
      throw new Error('Missing required fields');
    }

    const credentials = await getGoogleCredentials();
    
    let accessToken = credentials.access_token;
    const now = new Date();
    const expiresAt = new Date(credentials.expires_at);

    if (now >= expiresAt) {
      accessToken = await refreshAccessToken(credentials.refresh_token);
      
      const newExpiresAt = new Date(now.getTime() + 3600 * 1000);
      await fetch(`${SUPABASE_URL}/rest/v1/google_meet_credentials?id=eq.${credentials.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString()
        })
      });
    }

    const eventData = await createGoogleMeetEvent(accessToken, payload);

    const googleMeetLink = eventData.hangoutLink || eventData.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri;

    if (!googleMeetLink) {
      throw new Error('Failed to extract Google Meet link from event');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        google_meet_link: googleMeetLink,
        meeting_details: {
          event_id: eventData.id,
          start_time: eventData.start.dateTime,
          end_time: eventData.end.dateTime,
          html_link: eventData.htmlLink
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Google Meet generation failed:', error);

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
