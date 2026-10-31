
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[ADD-EXPENDITURE] ========================================');
    console.log('[ADD-EXPENDITURE] add-expenditure function called');
    console.log('[ADD-EXPENDITURE] Timestamp:', new Date().toISOString());
    console.log('[ADD-EXPENDITURE] ========================================');

    // Get Supabase service role client (bypasses RLS - full database access)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[ADD-EXPENDITURE] Environment check:');
    console.log('[ADD-EXPENDITURE]   - Supabase URL present:', !!supabaseUrl);
    console.log('[ADD-EXPENDITURE]   - Service key present:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = 'Missing Supabase credentials (URL or Service Key)';
      console.error('[ADD-EXPENDITURE] ❌ ERROR:', errorMsg);
      throw new Error(errorMsg);
    }

    // Create client with SERVICE ROLE key - bypasses ALL RLS policies
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[ADD-EXPENDITURE] ✓ Supabase service role client created (full access)');

    // Parse request body
    const body = await req.json();
    console.log('[ADD-EXPENDITURE] Request body received:');
    console.log(JSON.stringify(body, null, 2));

    const { description, amount, category, category_id, date, notes } = body;

    // Validate required fields
    console.log('[ADD-EXPENDITURE] Validating required fields...');
    const missingFields = [];
    if (!description) missingFields.push('description');
    if (!amount && amount !== 0) missingFields.push('amount');
    if (!date) missingFields.push('date');

    if (missingFields.length > 0) {
      const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
      console.error('[ADD-EXPENDITURE] ❌ Validation failed:', errorMsg);
      
      // Log validation error to error_logs table
      await supabase.from('error_logs').insert({
        function_name: 'add-expenditure',
        error_message: errorMsg,
        error_type: 'ValidationError',
        severity: 'low',
        request_data: body,
        status_code: 400
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[ADD-EXPENDITURE] ✓ All required fields present');

    // Prepare expenditure payload
    const expenditurePayload = {
      description: description.trim(),
      amount: parseFloat(amount),
      category: category?.trim() || null,
      category_id: category_id || null,
      date,
      notes: notes?.trim() || null
    };

    console.log('[ADD-EXPENDITURE] ========================================');
    console.log('[ADD-EXPENDITURE] Inserting expenditure with data:');
    console.log(JSON.stringify(expenditurePayload, null, 2));
    console.log('[ADD-EXPENDITURE] Field types:');
    console.log('[ADD-EXPENDITURE]   - description (TEXT):', typeof expenditurePayload.description);
    console.log('[ADD-EXPENDITURE]   - amount (NUMERIC):', typeof expenditurePayload.amount);
    console.log('[ADD-EXPENDITURE]   - category (TEXT):', typeof expenditurePayload.category, '=', expenditurePayload.category);
    console.log('[ADD-EXPENDITURE]   - category_id (UUID):', typeof expenditurePayload.category_id, '=', expenditurePayload.category_id);
    console.log('[ADD-EXPENDITURE]   - date (DATE):', typeof expenditurePayload.date);
    console.log('[ADD-EXPENDITURE]   - notes (TEXT):', typeof expenditurePayload.notes);
    console.log('[ADD-EXPENDITURE] ========================================');

    // Insert into expenditures table using SERVICE ROLE (bypasses ALL RLS)
    console.log('[ADD-EXPENDITURE] Calling Supabase insert...');
    const { data, error } = await supabase
      .from('expenditures')
      .insert(expenditurePayload)
      .select()
      .single();

    if (error) {
      console.error('[ADD-EXPENDITURE] ========================================');
      console.error('[ADD-EXPENDITURE] ❌ Database insert FAILED');
      console.error('[ADD-EXPENDITURE] Error code:', error.code);
      console.error('[ADD-EXPENDITURE] Error message:', error.message);
      console.error('[ADD-EXPENDITURE] Error details:', error.details);
      console.error('[ADD-EXPENDITURE] Error hint:', error.hint);
      console.error('[ADD-EXPENDITURE] ========================================');

      // Log database error to error_logs table
      await supabase.from('error_logs').insert({
        function_name: 'add-expenditure',
        error_message: error.message,
        error_type: 'DatabaseError',
        severity: 'high',
        request_data: expenditurePayload,
        response_data: {
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        status_code: 500
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message || 'Failed to insert expenditure' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[ADD-EXPENDITURE] ========================================');
    console.log('[ADD-EXPENDITURE] ✓✓✓ SUCCESS - Expenditure created! ✓✓✓');
    console.log('[ADD-EXPENDITURE] Created expenditure ID:', data.id);
    console.log('[ADD-EXPENDITURE] Full record:', JSON.stringify(data, null, 2));
    console.log('[ADD-EXPENDITURE] ========================================');

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id,
        expenditure: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ADD-EXPENDITURE] ========================================');
    console.error('[ADD-EXPENDITURE] ❌❌❌ UNEXPECTED ERROR ❌❌❌');
    console.error('[ADD-EXPENDITURE] Error type:', error.constructor.name);
    console.error('[ADD-EXPENDITURE] Error message:', error.message);
    console.error('[ADD-EXPENDITURE] Error stack:', error.stack);
    console.error('[ADD-EXPENDITURE] ========================================');

    // Attempt to log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('error_logs').insert({
          function_name: 'add-expenditure',
          error_message: error.message,
          error_stack: error.stack,
          error_type: error.constructor.name,
          severity: 'critical',
          status_code: 500
        });
      }
    } catch (logError) {
      console.error('[ADD-EXPENDITURE] Failed to log error to database:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
