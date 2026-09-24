# Menial Admin & Superadmin Dashboards

> Next.js / TypeScript responsive desktop-first web application.

This directory will contain the Admin Dashboard and Superadmin Dashboard. Scaffolding will be created in a later phase.

## Planned Structure

```
/admin
├── app/              # Next.js App Router
│   ├── admin/        # Admin routes (RBAC-protected)
│   └── superadmin/   # Superadmin routes (Superadmin-only)
├── components/       # Reusable dashboard components
├── services/         # Service abstractions
├── hooks/            # Custom React hooks
└── lib/              # Supabase client, auth helpers
```

## Authorization Boundaries (§18, §73)

- Admin and Superadmin share infrastructure but have **separate authorization boundaries**
- All authorization is **server-side enforced** via RLS and Edge Functions
- Frontend route guards are supplementary only — never the sole protection
