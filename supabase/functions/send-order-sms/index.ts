
import { corsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, orderId, amount, customerName } = await req.json();

    // 1. Retrieve Twilio Credentials
    const ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');

    // 2. Format Message
    const messageBody = `🛍️ Order Confirmed!\nHi ${customerName}, thanks for ordering from ArbiecupCake!\nOrder: #${orderId.slice(0, 8)}\nTotal: GH₵${amount.toFixed(2)}\nEst. Delivery: 45-60 mins.`;

    // 3. Send SMS via Twilio API
    let responseData;

    // Fallback/Dev Mode if secrets aren't configured or look like placeholders
    if (!ACCOUNT_SID || !AUTH_TOKEN || ACCOUNT_SID.includes('replace_with')) {
      console.log(`[Mock Twilio SMS] To: ${phone}`);
      console.log(`[Content] ${messageBody}`);
      responseData = { success: true, mode: 'mock', sid: 'SM' + crypto.randomUUID() };
    } else {
      console.log(`[Twilio API] Sending SMS to ${phone} from ${FROM_NUMBER || 'ArbieCakes'}...`);
      
      // Construct form data for Twilio
      const body = new URLSearchParams({
        To: phone,
        From: FROM_NUMBER || 'ArbieCakes', // Use Alphanumeric Sender ID if number not provided
        Body: messageBody,
      });

      const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Twilio API Error]', data);
        throw new Error(data.message || 'Failed to send SMS');
      }

      responseData = data;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
