/**
 * Seed Leave Types for Be Creative
 *
 * Instructions:
 * 1. Login to Super Admin at https://be-creative.quriosityhub.com/super-admin/login
 * 2. Open browser console (F12 -> Console tab)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

(async function seedLeaveTypes() {
  console.log('🔍 Fetching organizations...');

  // Get all organizations
  const orgsResponse = await fetch('/api/super-admin/seed-leave-types');
  const orgsData = await orgsResponse.json();

  if (!orgsResponse.ok) {
    console.error('❌ Failed to fetch organizations:', orgsData);
    return;
  }

  console.log('📋 Organizations:', orgsData.organizations);
  console.log('⚠️  Need seeding:', orgsData.needsSeeding);

  // Find Be Creative
  const beCreative = orgsData.organizations.find(o =>
    o.slug === 'be-creative' ||
    o.name.toLowerCase().includes('be creative')
  );

  if (!beCreative) {
    console.error('❌ Be Creative organization not found');
    return;
  }

  console.log('\n🏢 Found Be Creative:', beCreative);
  console.log('   Leave Types:', beCreative.leaveTypeCount);

  if (beCreative.leaveTypeCount > 0) {
    console.log('✅ Leave types already exist. Skipping seeding.');
    console.log('   To force re-seed balances only, set withBalances: true below');
  }

  // Seed leave types and balances
  console.log('\n🌱 Seeding leave types and initializing balances...');

  const seedResponse = await fetch('/api/super-admin/seed-leave-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: beCreative.id,
      withBalances: true
    })
  });

  const seedResult = await seedResponse.json();

  if (!seedResponse.ok) {
    console.error('❌ Failed to seed:', seedResult);
    return;
  }

  console.log('\n✅ SUCCESS!');
  console.log('📊 Results:', seedResult.results);
  console.log('\n📝 Leave Types:');
  seedResult.results.leaveTypes.details.forEach(d => console.log('   ' + d));
  console.log('\n👥 User Balances:');
  seedResult.results.balances.users.forEach(u => console.log('   ' + u));
  console.log('\n🎉 Done! Refresh the Leave Balances page to see the changes.');
})();
