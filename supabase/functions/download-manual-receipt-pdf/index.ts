
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receipt_id } = await req.json();

    console.log('Download Manual Receipt PDF - Request:', { receipt_id });

    if (!receipt_id) {
      throw new Error('receipt_id is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch receipt details
    const { data: receipt, error: fetchError } = await supabase
      .from('manual_receipts')
      .select('*')
      .eq('id', receipt_id)
      .single();

    if (fetchError || !receipt) {
      throw new Error('Receipt not found');
    }

    console.log('Receipt found:', receipt.receipt_number);

    // Generate receipt HTML
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-manual-receipt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        training_registration_id: receipt.training_registration_id,
        student_name: receipt.student_name,
        student_email: receipt.student_email,
        course_name: receipt.course_name,
        amount: receipt.amount,
        receipt_date: receipt.receipt_date,
        receipt_number: receipt.receipt_number
      })
    });

    if (!generateResponse.ok) {
      throw new Error('Failed to generate receipt HTML');
    }

    const generateData = await generateResponse.json();
    if (!generateData.success) {
      throw new Error(generateData.error || 'Receipt generation failed');
    }

    // For now, return HTML for client-side PDF generation
    // In production, you'd use a PDF library like puppeteer or wkhtmltopdf
    console.log('Receipt HTML ready for PDF conversion');

    return new Response(
      JSON.stringify({ 
        success: true, 
        receipt_html: generateData.receipt_html,
        receipt_number: receipt.receipt_number,
        message: 'Receipt HTML ready for download'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error downloading receipt PDF:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to download receipt PDF'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
