
import { corsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      training_registration_id,
      receipt_number,
      student_name,
      student_email,
      course_name,
      amount,
      receipt_date,
      description
    } = await req.json();

    // Validation
    if (!receipt_number || !student_name || !student_email || !course_name || !amount || !receipt_date) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Format amount as currency
    const formattedAmount = parseFloat(amount).toFixed(2);
    const receiptDateFormatted = new Date(receipt_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Generate professional receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 700px;
              margin: 0 auto;
              padding: 40px 20px;
              background-color: #f8fafc;
            }
            .receipt-container {
              background: white;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .receipt-header {
              text-align: center;
              border-bottom: 3px solid #ec4899;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .receipt-header h1 {
              color: #ec4899;
              font-size: 32px;
              margin: 0 0 10px 0;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .receipt-header .company-name {
              font-size: 24px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .receipt-header .tagline {
              font-size: 14px;
              color: #94a3b8;
              font-style: italic;
            }
            .receipt-number {
              text-align: right;
              font-size: 14px;
              color: #64748b;
              margin-bottom: 10px;
            }
            .receipt-number strong {
              color: #1e293b;
              font-size: 16px;
            }
            .receipt-date {
              text-align: right;
              font-size: 14px;
              color: #64748b;
              margin-bottom: 30px;
            }
            .details-section {
              background: #f8fafc;
              padding: 25px;
              border-radius: 8px;
              margin-bottom: 25px;
            }
            .details-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .details-row:last-child {
              border-bottom: none;
            }
            .details-label {
              font-weight: 600;
              color: #475569;
              font-size: 14px;
            }
            .details-value {
              color: #1e293b;
              font-size: 14px;
              text-align: right;
              max-width: 60%;
            }
            .amount-section {
              background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              margin: 30px 0;
              text-align: center;
            }
            .amount-label {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 10px;
              opacity: 0.9;
            }
            .amount-value {
              font-size: 42px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .description-section {
              background: #fffbeb;
              border-left: 4px solid #fbbf24;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .description-section h3 {
              margin: 0 0 10px 0;
              color: #92400e;
              font-size: 16px;
            }
            .description-section p {
              margin: 0;
              color: #78350f;
              font-size: 14px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 40px;
              padding-top: 25px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 13px;
            }
            .footer strong {
              color: #ec4899;
              font-size: 16px;
              display: block;
              margin-bottom: 8px;
            }
            .footer p {
              margin: 5px 0;
            }
            .stamp {
              text-align: center;
              margin-top: 30px;
              padding: 15px;
              border: 2px dashed #cbd5e1;
              border-radius: 8px;
              background: #f1f5f9;
            }
            .stamp p {
              margin: 5px 0;
              font-size: 12px;
              color: #475569;
              font-style: italic;
            }
            @media only screen and (max-width: 600px) {
              body { padding: 20px 10px; }
              .receipt-container { padding: 25px; }
              .receipt-header h1 { font-size: 24px; }
              .amount-value { font-size: 32px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="company-name">ArbiecupCake</div>
              <div class="tagline">Premium Cakes & Pastries Training Academy</div>
              <h1>RECEIPT</h1>
            </div>
            
            <div class="receipt-number">
              <strong>Receipt No:</strong> ${receipt_number}
            </div>
            <div class="receipt-date">
              <strong>Date:</strong> ${receiptDateFormatted}
            </div>
            
            <div class="details-section">
              <div class="details-row">
                <span class="details-label">Student Name:</span>
                <span class="details-value">${student_name}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Email Address:</span>
                <span class="details-value">${student_email}</span>
              </div>
              <div class="details-row">
                <span class="details-label">Course Name:</span>
                <span class="details-value">${course_name}</span>
              </div>
            </div>
            
            <div class="amount-section">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">GH₵ ${formattedAmount}</div>
            </div>
            
            ${description ? `
              <div class="description-section">
                <h3>Notes / Description</h3>
                <p>${description}</p>
              </div>
            ` : ''}
            
            <div class="stamp">
              <p><strong>Payment Received</strong></p>
              <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
            
            <div class="footer">
              <strong>ArbiecupCake</strong>
              <p>Premium Cakes & Pastries</p>
              <p>Email: info@arbiecupcake.com | Phone: +233 XX XXX XXXX</p>
              <p>Thank you for choosing ArbiecupCake Training Academy!</p>
              <p>&copy; ${new Date().getFullYear()} ArbiecupCake. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return new Response(
      JSON.stringify({
        success: true,
        receipt_html: receiptHtml,
        receipt_number: receipt_number
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating receipt:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to generate receipt" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
