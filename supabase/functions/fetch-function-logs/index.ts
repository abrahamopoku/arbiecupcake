
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// NOTE: In a real production environment, fetching Edge Function logs usually requires 
// accessing the Supabase Management API which needs a Personal Access Token.
// Since we are restricted to the provided environment variables (Service Role Key), 
// we will simulate log retrieval by querying a custom 'function_logs' table if it exists, 
// or return a mock structure if we can't access platform logs directly.
//
// However, for this specific request, I will implement a solution that queries a 
// 'function_logs' table which we will create. This is the most reliable way to 
// store and retrieve application-level logs within the constraints of this environment.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      functionName, 
      startDate, 
      endDate, 
      logLevel, 
      searchKeyword, 
      page = 1, 
      limit = 50 
    } = await req.json();

    // Calculate pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Start building the query
    let query = supabaseClient
      .from('function_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);

    // Apply Filters
    if (functionName && functionName !== 'all') {
      query = query.eq('function_name', functionName);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    if (logLevel && logLevel !== 'all') {
      query = query.eq('level', logLevel);
    }

    if (searchKeyword) {
      query = query.ilike('message', `%${searchKeyword}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      // If table doesn't exist yet, return empty structure gracefully
      if (error.code === '42P01') { 
        return new Response(JSON.stringify({ 
          logs: [], 
          total: 0, 
          page, 
          pageSize: limit, 
          hasMore: false,
          note: "Log table not found. Please ensure migration is run." 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({
      logs: data,
      total: count,
      page,
      pageSize: limit,
      hasMore: count > to + 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error fetching logs:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
