
import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      throw new Error('Email, password, and role are required');
    }

    console.log('[ADMIN SETUP] === Creating New Admin User ===');
    console.log(`[ADMIN SETUP] Creating Supabase auth user: ${email}`);

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role
      }
    });

    if (authError) {
      console.error('[ADMIN SETUP] ❌ Failed to create auth user:', authError.message);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    console.log('[ADMIN SETUP] ✓ Auth user created successfully');
    console.log(`[ADMIN SETUP] User ID: ${authData.user.id}`);

    const userId = authData.user.id;

    // Step 2: Create admin_users record
    console.log('[ADMIN SETUP] Creating admin_users record');

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: userId,
        email: email,
        password_hash: 'managed_by_supabase_auth',
        full_name: 'Admin User',
        role: role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (adminError) {
      console.error('[ADMIN SETUP] ❌ Failed to create admin_users record:', adminError.message);
      
      // Cleanup: delete auth user if admin_users creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      
      throw new Error(`Failed to create admin_users record: ${adminError.message}`);
    }

    console.log('[ADMIN SETUP] ✓ Admin user record created successfully');

    // Step 3: Verify the record
    console.log('[ADMIN SETUP] Verifying admin_users record...');

    const { data: verifiedUser, error: verifyError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .single();

    if (verifyError || !verifiedUser) {
      console.error('[ADMIN SETUP] ❌ Verification failed');
      throw new Error('Failed to verify admin_users record');
    }

    console.log('[ADMIN SETUP] ✓ Verification successful');
    console.log('[ADMIN SETUP] ✓ User ready for login');
    console.log(`[ADMIN SETUP] Email: ${email}`);
    console.log(`[ADMIN SETUP] Password: ${password}`);
    console.log(`[ADMIN SETUP] Role: ${verifiedUser.role}`);
    console.log('[ADMIN SETUP] === Admin User Creation Complete ===');

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        email: email,
        role: verifiedUser.role,
        message: `Admin user ${email} is ready for login`,
        verification: {
          authUserExists: true,
          adminUserExists: true,
          roleCorrect: verifiedUser.role === role,
          status: 'active'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[ADMIN SETUP] Error:', error.message);
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
