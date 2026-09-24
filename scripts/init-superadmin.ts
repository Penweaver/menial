/**
 * Menial Platform - Superadmin Bootstrap Tool
 * 
 * Secure deployment initialization script for bootstrapping the sole Superadmin account.
 * Reference: menial-master-spec-v2.md (§11, §20, §23, §67, §74)
 * 
 * Usage:
 *   npx ts-node scripts/init-superadmin.ts --email superadmin@menial.ng --password "StrongPassword123!" --name "Platform Superadmin"
 *   OR set environment variables: SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

interface CliArgs {
  email?: string;
  password?: string;
  name?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email' && argv[i + 1]) {
      args.email = argv[++i];
    } else if (argv[i] === '--password' && argv[i + 1]) {
      args.password = argv[++i];
    } else if (argv[i] === '--name' && argv[i + 1]) {
      args.name = argv[++i];
    }
  }

  return {
    email: args.email || process.env.SUPERADMIN_EMAIL,
    password: args.password || process.env.SUPERADMIN_PASSWORD,
    name: args.name || process.env.SUPERADMIN_NAME || 'Platform Superadmin',
  };
}

async function bootstrapSuperadmin() {
  const { email, password, name } = parseArgs();

  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is required in .env to bootstrap Superadmin.');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.');
    console.log('Usage: npx ts-node scripts/init-superadmin.ts --email <email> --password <password> [--name <name>]');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n======================================================`);
  console.log(`🔐 MENIAL: SUPERADMIN INITIALIZATION BOOTSTRAP (§11)`);
  console.log(`======================================================\n`);

  // 1. Verify Superadmin uniqueness (§11, §20)
  console.log('Checking database for existing Superadmin account...');
  const { data: existingSuperadmin, error: checkError } = await supabase
    .from('admin_users')
    .select('id, user_id, status, created_at')
    .eq('is_superadmin', true)
    .maybeSingle();

  if (checkError) {
    console.error('❌ Database query error:', checkError.message);
    process.exit(1);
  }

  if (existingSuperadmin) {
    console.error(`❌ CRITICAL SECURITY ERROR (§11, §20):`);
    console.error(`   A Superadmin account already exists in this database (ID: ${existingSuperadmin.id}).`);
    console.error(`   The platform enforces EXACTLY ONE Superadmin. Creation of a second Superadmin is strictly prohibited.`);
    console.error(`   If this is a recovery scenario, see Section 74 of the Master Specification.\n`);
    process.exit(1);
  }

  // 2. Create or find the Supabase Auth user
  console.log(`Creating Auth user for ${email}...`);
  let authUserId: string;

  const { data: createUserData, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'superadmin' },
  });

  if (createUserError) {
    // If user already exists in auth, fetch their user ID
    if (createUserError.message.includes('already registered')) {
      console.log('Auth user already exists. Locating record...');
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        process.exit(1);
      }
      const existingUser = listData.users.find((u) => u.email === email);
      if (!existingUser) {
        console.error('❌ Unable to find existing auth user ID.');
        process.exit(1);
      }
      authUserId = existingUser.id;
    } else {
      console.error('❌ Failed to create Auth user:', createUserError.message);
      process.exit(1);
    }
  } else {
    authUserId = createUserData.user.id;
  }

  // 3. Insert or update the profile row
  console.log('Configuring profile record...');
  await supabase.from('profiles').upsert({
    id: authUserId,
    full_name: name,
    email,
    phone: '+2340000000000', // Administrative placeholder phone
    account_type: 'employer',
    status: 'active',
  });

  // 4. Create the sole Superadmin record in admin_users (§11)
  console.log('Creating unique Superadmin authority record...');
  const { data: adminUser, error: adminInsertError } = await supabase
    .from('admin_users')
    .insert({
      user_id: authUserId,
      is_superadmin: true,
      status: 'active',
      mfa_enrolled: false, // Mandatory upon first login (§23)
    })
    .select()
    .single();

  if (adminInsertError) {
    console.error('❌ Failed to create admin_users record:', adminInsertError.message);
    process.exit(1);
  }

  // 5. Write bootstrap event to immutable audit log (§67)
  console.log('Recording immutable audit log entry...');
  await supabase.from('audit_logs').insert({
    actor_id: adminUser.id,
    actor_role: 'system',
    action: 'superadmin.bootstrap',
    target_type: 'admin_user',
    target_id: adminUser.id,
    new_state: {
      user_id: authUserId,
      email,
      is_superadmin: true,
      status: 'active',
    },
    reason: 'Initial platform Superadmin bootstrap deployment procedure (§11)',
  });

  console.log('\n✅ SUPERADMIN BOOTSTRAP COMPLETE!');
  console.log(`   Admin ID:     ${adminUser.id}`);
  console.log(`   User ID:      ${authUserId}`);
  console.log(`   Email:        ${email}`);
  console.log(`   Status:       ACTIVE`);
  console.log(`\n⚠️  NEXT STEP (§23):`);
  console.log(`   Upon initial login to the Superadmin dashboard, you MUST enroll in TOTP Multi-Factor Authentication (MFA).`);
  console.log(`   No administrative operations can be performed without completing MFA verification.\n`);
}

bootstrapSuperadmin().catch((err) => {
  console.error('Unexpected error during bootstrap:', err);
  process.exit(1);
});
