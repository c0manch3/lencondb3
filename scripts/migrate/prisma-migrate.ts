/**
 * Prisma-based data migration from Supabase to local PostgreSQL.
 *
 * Use this when pg_dump/pg_restore is not available (e.g., no psql client).
 *
 * Usage:
 *   SUPABASE_URL="postgresql://..." DATABASE_URL="postgresql://..." npx ts-node scripts/migrate/prisma-migrate.ts
 *
 * Requirements:
 *   - Both databases must have the same schema already applied.
 *   - Target database should be empty (run prisma migrate dev first, skip seed).
 */
import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = process.env.SUPABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL) {
  console.error('Error: Set SUPABASE_URL environment variable');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('Error: Set DATABASE_URL environment variable');
  process.exit(1);
}

const source = new PrismaClient({
  datasources: { db: { url: SUPABASE_URL } },
});

const target = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

async function migrateTable<T extends Record<string, unknown>>(
  name: string,
  findAll: () => Promise<T[]>,
  createOne: (data: T) => Promise<unknown>,
): Promise<number> {
  const records = await findAll();
  console.log(`Migrating ${records.length} ${name}...`);
  let succeeded = 0;
  let failed = 0;
  for (const record of records) {
    try {
      await createOne(record);
      succeeded++;
    } catch (error) {
      failed++;
      console.error(`  Failed to migrate record ${(record as any).id}: ${(error as Error).message}`);
    }
  }
  console.log(`  Result: ${succeeded} succeeded, ${failed} failed`);
  if (failed > 0) {
    console.warn(`  WARNING: ${failed} records failed to migrate in this table`);
  }
  return succeeded;
}

async function migrate(): Promise<void> {
  console.log('Starting Prisma-based migration...');
  console.log(`Source: ${SUPABASE_URL!.replace(/\/\/.*@/, '//***@')}`);
  console.log(`Target: ${DATABASE_URL!.replace(/\/\/.*@/, '//***@')}`);
  console.log('');

  let totalRows = 0;

  // Order matters: respect FK dependencies

  // 1. Users (no FK deps)
  totalRows += await migrateTable(
    'users',
    () => source.user.findMany(),
    (data) => target.user.create({ data }),
  );

  // 2. Companies (no FK deps)
  totalRows += await migrateTable(
    'companies',
    () => source.company.findMany(),
    (data) => target.company.create({ data }),
  );

  // 3. SmtpConfigs (no FK deps)
  totalRows += await migrateTable(
    'smtp configs',
    () => source.smtpConfig.findMany(),
    (data) => target.smtpConfig.create({ data }),
  );

  // 4. Projects (depends on users, companies)
  totalRows += await migrateTable(
    'projects',
    () => source.project.findMany(),
    (data) => target.project.create({ data }),
  );

  // 5. ProjectUsers (depends on users, projects)
  totalRows += await migrateTable(
    'project users',
    () => source.projectUser.findMany(),
    (data) => target.projectUser.create({ data }),
  );

  // 6. WorkloadPlan (depends on users, projects)
  totalRows += await migrateTable(
    'workload plans',
    () => source.workloadPlan.findMany(),
    (data) => target.workloadPlan.create({ data }),
  );

  // 7. WorkloadActual (depends on users)
  totalRows += await migrateTable(
    'workload actuals',
    () => source.workloadActual.findMany(),
    (data) => {
      // Strip relation fields that Prisma may include
      const { distributions, ...cleanData } = data as Record<string, unknown>;
      return target.workloadActual.create({ data: cleanData as any });
    },
  );

  // 8. ProjectWorkloadDistributions (depends on workload_actual, projects)
  totalRows += await migrateTable(
    'workload distributions',
    () => source.projectWorkloadDistribution.findMany(),
    (data) => target.projectWorkloadDistribution.create({ data }),
  );

  // 9. PaymentSchedules (depends on projects)
  totalRows += await migrateTable(
    'payment schedules',
    () => source.paymentSchedule.findMany(),
    (data) => target.paymentSchedule.create({ data }),
  );

  // 10. RefreshTokens (depends on users)
  totalRows += await migrateTable(
    'refresh tokens',
    () => source.refreshToken.findMany(),
    (data) => target.refreshToken.create({ data }),
  );

  // 11. EmployeeProposals (depends on users)
  totalRows += await migrateTable(
    'employee proposals',
    () => source.employeeProposal.findMany(),
    (data) => target.employeeProposal.create({ data }),
  );

  // 12. LenconnectChatLogs (depends on users)
  totalRows += await migrateTable(
    'chat logs',
    () => source.lenconnectChatLog.findMany(),
    (data) => target.lenconnectChatLog.create({ data }),
  );

  // 13. InviteTokens (depends on users)
  totalRows += await migrateTable(
    'invite tokens',
    () => source.inviteToken.findMany(),
    (data) => target.inviteToken.create({ data }),
  );

  // 14. Expenses (depends on users)
  totalRows += await migrateTable(
    'expenses',
    () => source.expense.findMany(),
    (data) => target.expense.create({ data }),
  );

  console.log('');
  console.log(`Migration complete! Total rows migrated: ${totalRows}`);

  await source.$disconnect();
  await target.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
