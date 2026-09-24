import { getSupabaseBrowserClient, toDatabaseClient } from './supabase/client';
import { AdminOperationsService } from '@shared/services/operations/AdminOperationsService';
import { SuperadminService } from '@shared/services/superadmin/SuperadminService';
import { AdminService } from '@shared/services/admin/AdminService';

let adminOpsService: AdminOperationsService | null = null;
let superadminService: SuperadminService | null = null;
let adminService: AdminService | null = null;

export function getAdminOperationsService(): AdminOperationsService {
  if (!adminOpsService) {
    const supabase = getSupabaseBrowserClient();
    adminOpsService = new AdminOperationsService(toDatabaseClient(supabase));
  }
  return adminOpsService;
}

export function getSuperadminService(): SuperadminService {
  if (!superadminService) {
    const supabase = getSupabaseBrowserClient();
    superadminService = new SuperadminService(toDatabaseClient(supabase));
  }
  return superadminService;
}

export function getAdminService(): AdminService {
  if (!adminService) {
    const supabase = getSupabaseBrowserClient();
    adminService = new AdminService(toDatabaseClient(supabase));
  }
  return adminService;
}
