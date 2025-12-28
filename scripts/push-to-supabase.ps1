# Push Prisma schema to Supabase database
# Run this script in PowerShell: .\scripts\push-to-supabase.ps1

# Use direct connection (not pooler) for schema operations
$env:DATABASE_URL="postgresql://postgres:MrpCkraPkl%40053@db.bwgsqpvbfyehbgzeldvu.supabase.co:5432/postgres"

Write-Host "Pushing schema to Supabase..." -ForegroundColor Cyan
npx prisma db push --skip-generate --accept-data-loss

Write-Host "Done!" -ForegroundColor Green
