import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runMigration() {
  console.log('🚀 Running role migration...\n')

  try {
    // Step 1: Add new role values to the Role enum
    console.log('Step 1: Adding new roles to enum...')
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEMP_STAFF'`)
    } catch {
      console.log('  TEMP_STAFF role may already exist')
    }
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCREDITATION_ADDER'`
      )
    } catch {
      console.log('  ACCREDITATION_ADDER role may already exist')
    }
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCREDITATION_APPROVER'`
      )
    } catch {
      console.log('  ACCREDITATION_APPROVER role may already exist')
    }
    console.log('✅ Roles added to enum')

    // Step 2: Check how many users need migration
    const usersToMigrate = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "User"
      WHERE "isTemporaryStaff" = true AND "deletedAt" IS NULL
    `
    console.log(`\nStep 2: Found ${usersToMigrate[0].count} users to migrate to TEMP_STAFF`)

    // Step 3: Update users with isTemporaryStaff=true to TEMP_STAFF role
    if (Number(usersToMigrate[0].count) > 0) {
      console.log('Step 3: Updating users to TEMP_STAFF role...')
      await prisma.$executeRawUnsafe(`
        UPDATE "User"
        SET role = 'TEMP_STAFF'::"Role"
        WHERE "isTemporaryStaff" = true AND "deletedAt" IS NULL
      `)
      console.log('✅ Users updated to TEMP_STAFF role')
    }

    // Step 4: Drop the soft-delete related columns
    console.log('\nStep 4: Dropping soft-delete columns...')
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedById"`)
    } catch {
      console.log('  deletedById column may not exist')
    }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt"`)
    } catch {
      console.log('  deletedAt column may not exist')
    }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN IF EXISTS "deletionNotes"`)
    } catch {
      console.log('  deletionNotes column may not exist')
    }
    console.log('✅ Soft-delete columns dropped')

    // Step 5: Drop the isTemporaryStaff column
    console.log('\nStep 5: Dropping isTemporaryStaff column...')
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" DROP COLUMN IF EXISTS "isTemporaryStaff"`
      )
    } catch {
      console.log('  isTemporaryStaff column may not exist')
    }
    console.log('✅ isTemporaryStaff column dropped')

    console.log('\n✅ Role migration completed successfully!')

    // Verify the changes
    console.log('\n📊 Verification:')
    const tempStaffCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "User" WHERE role = 'TEMP_STAFF'
    `
    console.log(`Users with TEMP_STAFF role: ${tempStaffCount[0].count}`)

    const columnCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'User'
      AND column_name IN ('isTemporaryStaff', 'deletedAt', 'deletedById', 'deletionNotes')
    `
    console.log(
      'Remaining old columns:',
      columnCheck.length === 0 ? 'None (all removed)' : columnCheck
    )
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
