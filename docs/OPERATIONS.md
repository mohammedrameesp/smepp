# DAMP Operations Runbook

This document provides operational procedures for maintaining and troubleshooting the DAMP application.

## 📋 Daily Operations

### Health Monitoring

**Check application health:**
```bash
curl http://localhost:3000/api/health
```

Expected response structure:
```json
{
  "ok": true,
  "time": "2024-01-01T00:00:00.000Z",
  "version": "dev",
  "uptime": 3600,
  "totalLatency": 45,
  "checks": {
    "db": {
      "status": "up",
      "latency": 12
    },
    "supabase": {
      "status": "up", 
      "latency": 33
    }
  }
}
```

**Health check alerts:**
- `ok: false` - Critical system failure
- `checks.db.status: "down"` - Database connectivity issues
- `checks.supabase.status: "down"` - File storage issues
- `totalLatency > 1000` - Performance degradation

### Daily Backup Verification

**Create daily backup:**
```bash
npm run backup:full create
```

**Verify backup completion:**
```bash
npm run backup:full status
```

**Check backup integrity:**
```bash
ls -la ./backups/
# Should show recent files:
# - damp-db-YYYY-MM-DDTHH-MM-SS.dump
# - damp-files-inventory-YYYY-MM-DDTHH-MM-SS.json
# - damp-backup-manifest-YYYY-MM-DDTHH-MM-SS.json
```

### Log Monitoring

**View recent application logs:**
```bash
# In development
tail -f .next/server.log

# In production (depends on hosting platform)
# Docker: docker logs container_name
# PM2: pm2 logs
# Systemctl: journalctl -u damp-service
```

**Key log patterns to monitor:**
- `ERROR` level entries - Application errors
- `Rate limit exceeded` - Potential abuse
- `Authentication failed` - Security concerns
- `Database connection` - Infrastructure issues

## 🛠️ Weekly Maintenance

### Database Maintenance

**Clean old activity logs:**
```bash
npm run ops:purge-activity
```

**Update database statistics:**
```bash
# Connect to PostgreSQL
psql $DATABASE_URL

-- Update table statistics for query optimization
ANALYZE;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

**Check database disk usage:**
```bash
# PostgreSQL disk usage query
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;

# Or use system commands
du -sh /var/lib/postgresql/data
```

### File Storage Maintenance

**Review file inventory:**
```bash
npm run backup:files inventory
```

**Check storage usage:**
```bash
npm run backup:files list | wc -l  # Count total files
```

**Clean up old backups:**
```bash
npm run backup:db cleanup 30      # Keep 30 days of DB backups
```

### Security Review

**Review recent activity logs:**
```bash
# Check for suspicious activity patterns
psql $DATABASE_URL -c "
SELECT action, COUNT(*) as count, actorUserId 
FROM \"ActivityLog\" 
WHERE at > NOW() - INTERVAL '7 days' 
GROUP BY action, actorUserId 
ORDER BY count DESC;
"
```

**Check rate limiting patterns:**
```bash
# Review application logs for rate limiting events
grep "Rate limit exceeded" logs/* | head -20
```

## 🚨 Incident Response

### Application Down

**Step 1: Check health endpoint**
```bash
curl -v http://localhost:3000/api/health
```

**Step 2: Check process status**
```bash
# Development
ps aux | grep node

# Production (example with PM2)
pm2 status
pm2 logs damp --lines 50
```

**Step 3: Check dependencies**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Test Supabase connection
npm run backup:files list
```

**Step 4: Restart if necessary**
```bash
# Development
npm run dev

# Production (example)
pm2 restart damp
```

### Database Issues

**Connection failures:**
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connection limits
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check disk space
df -h /var/lib/postgresql/
```

**Performance issues:**
```bash
# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"

# Check database locks
psql $DATABASE_URL -c "
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

### File Storage Issues

**Supabase connectivity:**
```bash
# Test basic connectivity
curl -I $SUPABASE_URL

# Test authenticated access
npm run backup:files list
```

**File access issues:**
```bash
# Check bucket permissions in Supabase dashboard
# Verify SUPABASE_SERVICE_ROLE_KEY has correct permissions
```

### High Load/Performance Issues

**Check system resources:**
```bash
# CPU and memory usage
top
htop

# Disk I/O
iotop

# Network connections
netstat -an | grep :3000
```

**Check application metrics:**
```bash
# Response times from health check
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Where curl-format.txt contains:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

**Scale if necessary:**
```bash
# Horizontal scaling (multiple instances)
# Vertical scaling (more resources)
# Database connection pooling
# CDN for static assets
```

## 🔧 Troubleshooting Common Issues

### Authentication Problems

**Azure AD configuration:**
1. Verify environment variables:
   - `AZURE_AD_CLIENT_ID`
   - `AZURE_AD_CLIENT_SECRET`
   - `AZURE_AD_TENANT_ID`
2. Check Azure AD app registration
3. Verify redirect URLs match `NEXTAUTH_URL`

**Session issues:**
```bash
# Clear sessions table
psql $DATABASE_URL -c "DELETE FROM \"Session\" WHERE expires < NOW();"

# Check session configuration
grep NEXTAUTH .env.local
```

### File Upload/Download Issues

**Upload failures:**
1. Check file size limits
2. Verify MIME type support
3. Check Supabase bucket permissions
4. Review file validation logs

**Download/signed URL issues:**
1. Check access control in logs
2. Verify entity ownership
3. Test signed URL generation manually

### Performance Degradation

**Database optimization:**
```bash
# Reindex tables
psql $DATABASE_URL -c "REINDEX DATABASE damp;"

# Update statistics
psql $DATABASE_URL -c "ANALYZE;"

# Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

**Application optimization:**
1. Review rate limiting logs
2. Check for memory leaks
3. Monitor garbage collection
4. Review cache hit rates

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

**Application Health:**
- Health endpoint response time
- Error rates by endpoint
- Authentication success rates

**Database Performance:**
- Connection count
- Query execution times
- Lock wait times
- Disk usage

**File Storage:**
- Upload/download success rates
- Storage usage trends
- Access pattern analysis

### Recommended Alert Thresholds

**Critical Alerts:**
- Health endpoint down for > 2 minutes
- Database connections > 80% of limit
- Disk usage > 90%
- Error rate > 5% over 5 minutes

**Warning Alerts:**
- Response time > 1 second average
- Database connections > 60% of limit
- Disk usage > 80%
- Rate limiting triggered > 100 times/hour

### Log Aggregation Setup

**For production environments:**

1. **Structured logging** is already implemented with Pino
2. **Log forwarding** options:
   - Fluentd/Fluent Bit
   - Logstash
   - Vector
   - Cloud-native solutions (CloudWatch, etc.)

3. **Recommended log retention:**
   - Application logs: 30 days
   - Access logs: 90 days
   - Error logs: 1 year
   - Audit logs: 7 years (compliance)

## 🔒 Security Operations

### Regular Security Tasks

**Weekly:**
- Review failed authentication attempts
- Check for unusual access patterns
- Verify rate limiting effectiveness
- Review file access logs

**Monthly:**
- Update dependencies: `npm audit fix`
- Review user permissions
- Check for security advisories
- Rotate secrets if needed

**Quarterly:**
- Security scan with tools like `npm audit`
- Review access control implementation
- Test backup restoration procedures
- Security training/awareness updates

### Security Incident Response

**Suspected breach:**
1. Immediately check activity logs
2. Review authentication patterns
3. Check file access logs
4. Consider temporary rate limit reduction
5. Notify stakeholders as required

**Unauthorized access:**
1. Identify affected accounts
2. Force logout: Clear sessions table
3. Review and rotate secrets
4. Check for data exfiltration
5. Document incident

## 📝 Documentation Updates

This runbook should be updated:
- After major application changes
- When new monitoring tools are added
- After incident resolution (lessons learned)
- Quarterly review and validation

**Version:** 1.0  
**Last Updated:** 2024-01-01  
**Next Review:** 2024-04-01