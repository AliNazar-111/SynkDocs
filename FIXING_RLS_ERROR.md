# 🔧 Fixing the Infinite Recursion Error

## Problem

You're seeing: **"infinite recursion detected in policy for relation 'document_collaborators'"**

This happens because the original RLS policies had circular references:
- Documents policy checks collaborators
- Collaborators policy checks documents
- Infinite loop! 🔁

## Solution

I've created a **fixed version** of the RLS policies without circular dependencies.

---

## Steps to Fix

### 1. **Run the Fixed RLS Policies**

Go to your Supabase project:

1. Open **SQL Editor**
2. Copy the contents of `database/02_rls_policies_fixed.sql`
3. Paste and click **Run**

This will:
- ✅ Drop all existing policies
- ✅ Create new policies without circular references
- ✅ Use direct subqueries instead of helper functions

### 2. **Refresh Your Browser**

After running the SQL:
1. Go back to `http://localhost:3001`
2. Refresh the page (F5)
3. You should see the dashboard load! 🎉

---

## What Was Changed

### Old (Broken) Approach:
```sql
-- This caused infinite recursion!
CREATE POLICY "users_can_view_accessible_documents"
  ON documents FOR SELECT
  USING (user_has_document_access(id, auth.uid()));
  -- ↑ This function checks collaborators
  -- ↓ Which checks documents again = LOOP!
```

### New (Fixed) Approach:
```sql
-- Direct subquery - no recursion!
CREATE POLICY "documents_select_policy"
  ON documents FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT document_id 
      FROM document_collaborators 
      WHERE user_id = auth.uid()
    )
  );
```

---

## Quick Fix Checklist

- [ ] Open Supabase SQL Editor
- [ ] Run `database/02_rls_policies_fixed.sql`
- [ ] Refresh browser at `localhost:3001`
- [ ] Dashboard should load without errors
- [ ] Try creating a document

---

## If You Still See Errors

### "Table not found"
→ Make sure you ran `01_schema.sql` first

### "Not authenticated"
→ Make sure you're logged in at `/login`

### "Permission denied"
→ Check that the policies ran successfully in SQL Editor

---

## Next Steps After Fix

Once the dashboard loads:

1. **Create a document** - Click "New Document"
2. **Open in editor** - Should navigate to `/documents/[id]`
3. **Test real-time** - Open same doc in another browser
4. **Add comments** - Test the comments sidebar
5. **Check versions** - View version history

---

## File to Run

**Location**: `database/02_rls_policies_fixed.sql`

This file:
- ✅ Drops old policies automatically
- ✅ Creates new non-recursive policies
- ✅ Maintains same security level
- ✅ Works with all existing features

**Just copy and paste into Supabase SQL Editor!**
