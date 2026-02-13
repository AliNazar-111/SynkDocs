# SynkDocs Database Migrations

Complete SQL migrations for SynkDocs PostgreSQL database.

## Order of Execution

Run these files in order in your Supabase SQL Editor:

### 1. Schema (`01_schema.sql`)
- Creates all tables (documents, collaborators, comments, versions)
- Sets up indexes for performance
- Configures triggers for automation
- Defines helper functions

**Run this first!**

```sql
-- Copy and paste contents of 01_schema.sql into Supabase SQL Editor
-- Click "Run"
```

### 2. RLS Policies (`02_rls_policies.sql`)
- Enables Row Level Security on all tables
- Defines access control policies
- Secures data based on user permissions

**Run this second!**

```sql
-- Copy and paste contents of 02_rls_policies.sql into Supabase SQL Editor
-- Click "Run"
```

## What Gets Created

### Tables
- `documents` - Document metadata and content
- `document_collaborators` - User permissions per document
- `comments` - Threaded comments with text anchoring
- `document_versions` - Version history snapshots
- `document_version_config` - Retention policies
- `security_audit_log` - Audit trail for sensitive operations

### Functions
- `user_has_document_access()` - Check if user can access document
- `user_has_role()` - Check user's role on document
- `get_comment_thread()` - Retrieve full comment thread
- `get_unresolved_threads()` - Get active comment threads
- `create_version_snapshot()` - Create version backup
- `restore_version()` - Restore previous version
- `get_document_storage_usage()` - Track version storage
- `transfer_document_ownership()` - Change document owner

### Triggers
- Auto-update `updated_at` timestamps
- Auto-set comment `thread_id`
- Auto-increment version numbers
- Log security events

## Verification

After running migrations, verify in Supabase Dashboard:

1. **Database** → **Tables** - Should see 6 tables
2. **Database** → **Functions** - Should see 8 functions
3. **Authentication** → **Policies** - Should see RLS policies enabled

## Rollback

To completely remove the schema:

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS document_version_config CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS document_collaborators CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TYPE IF EXISTS document_role CASCADE;
DROP FUNCTION IF EXISTS user_has_document_access CASCADE;
DROP FUNCTION IF EXISTS user_has_role CASCADE;
DROP FUNCTION IF EXISTS get_comment_thread CASCADE;
DROP FUNCTION IF EXISTS get_unresolved_threads CASCADE;
DROP FUNCTION IF EXISTS create_version_snapshot CASCADE;
DROP FUNCTION IF EXISTS restore_version CASCADE;
DROP FUNCTION IF EXISTS get_document_storage_usage CASCADE;
DROP FUNCTION IF EXISTS transfer_document_ownership CASCADE;
```

## Testing

After migrations, test with these queries:

```sql
-- Create a test document
INSERT INTO documents (owner_id, title, content)
VALUES (auth.uid(), 'Test Document', '{"type": "doc", "content": []}'::jsonb);

-- Verify RLS works
SELECT * FROM documents; -- Should only see your own documents

-- Create a comment
INSERT INTO comments (document_id, user_id, content)
VALUES (<document_id>, auth.uid(), 'Test comment');

-- Create version snapshot
SELECT create_version_snapshot(
  <document_id>,
  'Test Document',
  '{"type": "doc", "content": []}'::jsonb,
  'Initial version'
);
```

## Free Tier Capacity

| Table | Estimated Size (1000 docs) |
|-------|----------------------------|
| documents | ~1MB |
| collaborators | ~1MB |
| comments | ~3MB |
| versions | ~50-500MB (depends on retention) |
| **Total** | ~55-505MB |

**Fits comfortably in 500MB free tier!**

## Support

See the main README for:
- Architecture documentation
- API integration guide
- WebSocket setup

For issues, check:
- Supabase logs
- RLS policy violations
- Function execution errors
