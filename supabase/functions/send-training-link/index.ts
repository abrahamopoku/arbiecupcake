
import { corsHeaders } from "./cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerName, customerEmail, trainingTitle, classId, classLink } = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ArbiecupCake Academy <academy@arbiecupcake.com>",
        to: [customerEmail],
        subject: `Welcome to ${trainingTitle} - Class Details`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #db2777;">Welcome to the Academy! 🧁</h1>
            <p>Dear ${customerName},</p>
            <p>We are thrilled to have you join our <strong>${trainingTitle}</strong>.</p>
            
            <div style="background-color: #fce7f3; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #9d174d;">Your Class Details</h3>
              <p><strong>Student ID:</strong> <span style="font-family: monospace; font-size: 1.2em;">${classId}</span></p>
              <p>Please keep this ID safe as you will need it for certification.</p>
            </div>

            <p>You can access the class materials and schedule using the link below:</p>
            <a href="${classLink}" style="display: inline-block; background-color: #db2777; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Access Class Portal</a>

            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
              If the button doesn't work, copy and paste this link:<br>
              ${classLink}
            </p>
            
            <p>See you in class!<br>The ArbiecupCake Team</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
