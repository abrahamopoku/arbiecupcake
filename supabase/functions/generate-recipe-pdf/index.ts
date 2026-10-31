
import { corsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipe_id, recipe_title, recipe_content } = await req.json();

    if (!recipe_title || !recipe_content) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create simple HTML-to-PDF using jsPDF library
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #ec4899; border-bottom: 3px solid #ec4899; padding-bottom: 10px; }
            pre { white-space: pre-wrap; word-wrap: break-word; background: #f8fafc; padding: 20px; border-left: 4px solid #ec4899; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${recipe_title}</h1>
          <pre>${recipe_content}</pre>
          <div class="footer">
            <p><strong>ArbiecupCake</strong> | Premium Cakes & Pastries</p>
            <p>www.arbiecupcake.com | info@arbiecupcake.com</p>
            <p>&copy; ${new Date().getFullYear()} ArbiecupCake. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Use puppeteer-core alternative or simple text-based PDF
    // For now, return HTML that browser can print as PDF
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="recipe-${recipe_title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html"`
      }
    });

  } catch (error) {
    console.error("Error in generate-recipe-pdf:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
