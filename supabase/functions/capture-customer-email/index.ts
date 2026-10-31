
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id, customer_email, customer_name, customer_phone } = await req.json();

    if (!customer_email) {
      throw new Error("Customer email is required");
    }

    // 1. Check if customer exists
    const { data: existingCustomer, error: fetchError } = await supabaseClient
      .from('customers')
      .select('id, total_orders, total_spent')
      .eq('email', customer_email)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let customerId;

    if (existingCustomer) {
      // Update existing customer stats if needed, or just use ID
      customerId = existingCustomer.id;
    } else {
      // 2. Create new customer
      const { data: newCustomer, error: createError } = await supabaseClient
        .from('customers')
        .insert([{
          email: customer_email,
          full_name: customer_name,
          phone: customer_phone,
          total_orders: 0,
          total_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (createError) throw createError;
      customerId = newCustomer.id;
    }

    // 3. Update Order with customer_id if order_id is provided
    if (order_id) {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ customer_id: customerId })
        .eq('id', order_id);

      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ success: true, customer_id: customerId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
