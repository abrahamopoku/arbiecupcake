
import { corsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  const startTime = new Date().toISOString();
  console.log('========================================');
  console.log('=== GENERATE MANUAL RECEIPT - START ===');
  console.log('Start Time:', startTime);
  console.log('========================================');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Parse request body
    console.log('\n--- Step 1: Parse Request Body ---');
    const requestBody = await req.json();
    console.log('Raw Request Body:', JSON.stringify(requestBody, null, 2));

    const { 
      student_name, 
      student_email, 
      course_name, 
      amount, 
      receipt_date,
      receipt_number,
      invoice_number 
    } = requestBody;

    console.log('Parsed Parameters:', {
      student_name,
      student_email,
      course_name,
      amount,
      receipt_date,
      receipt_number,
      invoice_number: invoice_number || 'null'
    });

    // Step 2: Validate required fields
    console.log('\n--- Step 2: Validate Required Fields ---');
    const missingFields = [];
    if (!student_name) missingFields.push('student_name');
    if (!student_email) missingFields.push('student_email');
    if (!course_name) missingFields.push('course_name');
    if (!amount) missingFields.push('amount');
    if (!receipt_date) missingFields.push('receipt_date');
    if (!receipt_number) missingFields.push('receipt_number');

    if (missingFields.length > 0) {
      console.error('VALIDATION ERROR - Missing fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('✓ All required fields present');

    // Step 3: Format data
    console.log('\n--- Step 3: Format Data ---');
    const formattedAmount = parseFloat(amount).toFixed(2);
    console.log('Original Amount:', amount);
    console.log('Formatted Amount:', formattedAmount);

    const formattedDate = new Date(receipt_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    console.log('Original Date:', receipt_date);
    console.log('Formatted Date:', formattedDate);

    // Step 4: Generate HTML
    console.log('\n--- Step 4: Generate Receipt HTML ---');
    console.log('Building HTML structure...');

    const receipt_html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receipt_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8fafc;
      padding: 40px 20px;
      color: #1e293b;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
      color: white;
      text-align: center;
      padding: 40px 30px;
    }
    .company-name {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .receipt-title {
      font-size: 20px;
      opacity: 0.95;
      margin-bottom: 20px;
    }
    .receipt-number-box {
      background: rgba(255, 255, 255, 0.2);
      display: inline-block;
      padding: 10px 24px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 30px;
    }
    .details-grid {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      color: #1e293b;
      font-size: 16px;
      font-weight: 500;
      text-align: right;
    }
    .amount-box {
      background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .amount-label {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    .amount-value {
      font-size: 42px;
      font-weight: bold;
      letter-spacing: -1px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      border-top: 2px solid #e2e8f0;
      background: #f8fafc;
    }
    .footer-message {
      font-size: 16px;
      color: #475569;
      margin-bottom: 15px;
      font-style: italic;
    }
    .footer-info {
      font-size: 14px;
      color: #64748b;
      line-height: 1.8;
    }
    .company-tagline {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 15px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
    @media (max-width: 600px) {
      .header {
        padding: 30px 20px;
      }
      .company-name {
        font-size: 24px;
      }
      .receipt-title {
        font-size: 16px;
      }
      .content {
        padding: 30px 20px;
      }
      .details-grid {
        padding: 20px;
      }
      .amount-value {
        font-size: 32px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-name">ArbiecupCake Training Academy</div>
      <div class="receipt-title">Payment Receipt</div>
      <div class="receipt-number-box">${receipt_number}</div>
    </div>

    <div class="content">
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Student Name</span>
          <span class="detail-value">${student_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email Address</span>
          <span class="detail-value">${student_email}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Course Name</span>
          <span class="detail-value">${course_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Receipt Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        ${invoice_number ? `
        <div class="detail-row">
          <span class="detail-label">Invoice Number</span>
          <span class="detail-value">${invoice_number}</span>
        </div>
        ` : ''}
      </div>

      <div class="amount-box">
        <div class="amount-label">Amount Paid</div>
        <div class="amount-value">GH₵ ${formattedAmount}</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-message">Thank you for your payment!</div>
      <div class="footer-info">
        This is an official receipt issued by ArbiecupCake Training Academy.<br>
        For inquiries, please contact us at training@arbiecupcake.com
      </div>
      <div class="company-tagline">
        © ${new Date().getFullYear()} ArbiecupCake Training Academy - Professional Baking & Pastry Training
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    console.log('✓ HTML generated successfully');
    console.log('HTML Length:', receipt_html.length, 'characters');
    console.log('HTML Preview (first 300 chars):', receipt_html.substring(0, 300));
    console.log('HTML Preview (last 200 chars):', receipt_html.substring(receipt_html.length - 200));

    // Step 5: Validate HTML structure
    console.log('\n--- Step 5: Validate HTML Structure ---');
    const hasDoctype = receipt_html.includes('<!DOCTYPE html>');
    const hasTitle = receipt_html.includes(`<title>Receipt ${receipt_number}</title>`);
    const hasStudentName = receipt_html.includes(student_name);
    const hasAmount = receipt_html.includes(formattedAmount);

    console.log('Validation checks:', {
      has_doctype: hasDoctype,
      has_title: hasTitle,
      has_student_name: hasStudentName,
      has_amount: hasAmount
    });

    if (!hasDoctype || !hasTitle || !hasStudentName || !hasAmount) {
      console.warn('⚠ HTML validation warnings detected');
    } else {
      console.log('✓ HTML structure validated');
    }

    const endTime = new Date().toISOString();
    console.log('\n========================================');
    console.log('=== GENERATE MANUAL RECEIPT - SUCCESS ===');
    console.log('End Time:', endTime);
    console.log('Receipt Number:', receipt_number);
    console.log('========================================\n');

    return new Response(
      JSON.stringify({ 
        success: true, 
        receipt_html,
        message: 'Receipt HTML generated successfully',
        metadata: {
          receipt_number,
          html_length: receipt_html.length,
          timestamp: endTime
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error('\n========================================');
    console.error('=== GENERATE MANUAL RECEIPT - ERROR ===');
    console.error('Error Time:', errorTime);
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================\n');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate receipt HTML',
        error_type: error.constructor.name,
        timestamp: errorTime,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
