
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

    const { email, password, action } = await req.json();

    console.log('[ADMIN PORTAL] [setup-admin-user] Starting admin user setup...');
    console.log('[ADMIN PORTAL] [setup-admin-user] Email:', email);
    console.log('[ADMIN PORTAL] [setup-admin-user] Action:', action);

    let result = {
      success: false,
      message: '',
      authUser: null,
      adminUser: null,
      passwordVerified: false
    };

    // Step 1: Check if auth user exists
    console.log('[ADMIN PORTAL] [setup-admin-user] Step 1: Checking auth.users...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    let authUser = users.find(u => u.email === email);
    console.log('[ADMIN PORTAL] [setup-admin-user] Auth user exists:', !!authUser);

    // Step 2: Create or update auth user
    if (!authUser) {
      console.log('[ADMIN PORTAL] [setup-admin-user] Step 2: Creating new auth user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }

      authUser = newUser.user;
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Created new auth user:', authUser.id);
      result.message = 'Created new admin user: ' + email;
    } else {
      console.log('[ADMIN PORTAL] [setup-admin-user] Step 2: Updating existing auth user password...');
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password }
      );

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Updated password for:', email);
      result.message = 'Updated password for ' + email;
    }

    result.authUser = {
      id: authUser.id,
      email: authUser.email
    };

    // Step 3: Verify password by attempting sign in
    console.log('[ADMIN PORTAL] [setup-admin-user] Step 3: Verifying password...');
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('[ADMIN PORTAL] [setup-admin-user] ❌ Password verification failed:', signInError.message);
      result.passwordVerified = false;
    } else {
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Password verified for:', email);
      result.passwordVerified = true;
    }

    // Step 4: Check admin_users table
    console.log('[ADMIN PORTAL] [setup-admin-user] Step 4: Checking admin_users table...');
    const { data: existingAdmin, error: queryError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw new Error(`Failed to query admin_users: ${queryError.message}`);
    }

    // Step 5: Create or update admin_users record
    if (!existingAdmin) {
      console.log('[ADMIN PORTAL] [setup-admin-user] Step 5: Creating admin_users record...');
      const { data: newAdmin, error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({
          email,
          full_name: 'Admin User',
          role: 'super_admin',
          password_hash: 'managed_by_supabase_auth'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create admin_users record: ${insertError.message}`);
      }

      result.adminUser = newAdmin;
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Created admin_users record');
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Role set to super_admin');
    } else {
      console.log('[ADMIN PORTAL] [setup-admin-user] Step 5: Updating admin_users record...');
      const { data: updatedAdmin, error: updateError } = await supabaseAdmin
        .from('admin_users')
        .update({ role: 'super_admin' })
        .eq('email', email)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update admin_users record: ${updateError.message}`);
      }

      result.adminUser = updatedAdmin;
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Updated admin_users record');
      console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Role set to super_admin');
    }

    // Step 6: Final verification
    console.log('[ADMIN PORTAL] [setup-admin-user] Step 6: Final verification...');
    const { data: verifiedAdmin, error: verifyError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (verifyError || !verifiedAdmin) {
      throw new Error('Failed to verify admin_users record');
    }

    if (verifiedAdmin.role !== 'super_admin') {
      throw new Error(`Role verification failed: expected super_admin, got ${verifiedAdmin.role}`);
    }

    console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Verified admin_users record for:', email);
    console.log('[ADMIN PORTAL] [setup-admin-user] ✓ Role confirmed: super_admin');

    result.success = true;
    result.adminUser = verifiedAdmin;

    console.log('[ADMIN PORTAL] [setup-admin-user] === Setup Complete ===');
    console.log('[ADMIN PORTAL] [setup-admin-user] Auth User ID:', authUser.id);
    console.log('[ADMIN PORTAL] [setup-admin-user] Admin User ID:', verifiedAdmin.id);
    console.log('[ADMIN PORTAL] [setup-admin-user] Role:', verifiedAdmin.role);
    console.log('[ADMIN PORTAL] [setup-admin-user] Password Verified:', result.passwordVerified);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[ADMIN PORTAL] [setup-admin-user] Error:', error.message);
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
