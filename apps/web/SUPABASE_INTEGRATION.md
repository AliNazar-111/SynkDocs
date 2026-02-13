# Supabase Integration Guide for SynkDocs

## Overview

This directory contains the complete Supabase integration layer for SynkDocs, including:
- Type-safe client configuration
- API service layers
- Custom React hooks
- Error handling utilities

## Directory Structure

```
src/
├── lib/
│   ├── supabase-client.ts       # Supabase client setup
│   ├── errors.ts                # Error handling utilities
│   └── api/
│       ├── documents.ts         # Document CRUD operations
│       ├── comments.ts          # Comment operations
│       └── versions.ts          # Version history operations
├── hooks/
│   ├── useDocuments.ts          # Document data fetching hooks
│   ├── useComments.ts           # Comment data fetching hooks
│   └── useVersions.ts           # Version data fetching hooks
└── types/
    └── database.types.ts        # Generated Supabase types
```

---

## Usage Examples

### 1. Fetching Documents

```typescript
import { useDocuments } from '@/hooks/useDocuments';

function DocumentList() {
  const { documents, loading, error } = useDocuments();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {documents.map(doc => (
        <div key={doc.id}>{doc.title}</div>
      ))}
    </div>
  );
}
```

### 2. Creating a Document

```typescript
import { createDocument } from '@/lib/api/documents';

async function handleCreateDocument() {
  try {
    const newDoc = await createDocument('My New Document');
    console.log('Created:', newDoc);
  } catch (error) {
    console.error('Failed to create document:', error);
  }
}
```

### 3. Managing Collaborators

```typescript
import { addCollaborator, getDocumentCollaborators } from '@/lib/api/documents';

async function handleAddCollaborator(documentId: string, email: string) {
  try {
    // First, find the user by email
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (users) {
      await addCollaborator(documentId, users.id, 'editor');
      console.log('Collaborator added');
    }
  } catch (error) {
    console.error('Failed to add collaborator:', error);
  }
}
```

### 4. Working with Comments

```typescript
import { useComments } from '@/hooks/useComments';
import { createComment, resolveComment } from '@/lib/api/comments';

function CommentsPanel({ documentId }: { documentId: string }) {
  const { comments, loading } = useComments(documentId);

  async function handleAddComment(content: string) {
    await createComment(documentId, content);
    // Real-time subscription will auto-update the comments
  }

  async function handleResolve(commentId: string) {
    await resolveComment(commentId);
  }

  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id}>
          <p>{comment.content}</p>
          {!comment.resolved_at && (
            <button onClick={() => handleResolve(comment.id)}>
              Resolve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 5. Version History

```typescript
import { useVersions } from '@/hooks/useVersions';
import { createVersionSnapshot, restoreVersion } from '@/lib/api/versions';

function VersionHistory({ documentId }: { documentId: string }) {
  const { versions, loading, refetch } = useVersions(documentId);

  async function handleSaveVersion(title: string, content: any) {
    await createVersionSnapshot(
      documentId,
      title,
      content,
      'Manual save'
    );
    refetch();
  }

  async function handleRestore(versionId: string) {
    await restoreVersion(versionId);
    // This creates a new version with the old content
    refetch();
  }

  return (
    <div>
      {versions.map(version => (
        <div key={version.id}>
          <h4>Version {version.version_number}</h4>
          <p>{version.title}</p>
          <button onClick={() => handleRestore(version.id)}>
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Error Handling

### Using Try-Catch

```typescript
import { createDocument } from '@/lib/api/documents';
import { PermissionError, NotFoundError } from '@/lib/errors';

async function safeCreateDocument() {
  try {
    const doc = await createDocument('Title');
    return { success: true, data: doc };
  } catch (error) {
    if (error instanceof PermissionError) {
      console.error('You don't have permission');
    } else if (error instanceof NotFoundError) {
      console.error('Resource not found');
    } else {
      console.error('Unknown error:', error);
    }
    return { success: false, error };
  }
}
```

### Using Result Wrapper

```typescript
import { wrapAsync } from '@/lib/errors';
import { createDocument } from '@/lib/api/documents';

async function createWithResult() {
  const result = await wrapAsync(createDocument('Title'));
  
  if (result.success) {
    console.log('Document created:', result.data);
  } else {
    console.error('Error:', result.error.message);
  }
}
```

---

## Real-Time Subscriptions

### Subscribe to Document Changes

```typescript
import { subscribeToDocument } from '@/lib/api/documents';

useEffect(() => {
  const unsubscribe = subscribeToDocument(documentId, (updatedDoc) => {
    console.log('Document updated:', updatedDoc);
    // Update local state
  });

  return () => unsubscribe();
}, [documentId]);
```

### Subscribe to Comments

```typescript
import { subscribeToComments } from '@/lib/api/comments';

useEffect(() => {
  const unsubscribe = subscribeToComments(documentId, (comment, event) => {
    if (event === 'INSERT') {
      console.log('New comment:', comment);
    } else if (event === 'UPDATE') {
      console.log('Comment updated:', comment);
    }
  });

  return () => unsubscribe();
}, [documentId]);
```

---

## Query Patterns

### Fetching with Relations

```typescript
// Already implemented in API services
const doc = await getDocument(documentId);
// Returns document with collaborators array

const collab = await getDocumentCollaborators(documentId);
// Returns collaborators with user metadata
```

### Pagination (For Future Implementation)

```typescript
async function getDocumentsPaginated(page: number, pageSize: number = 20) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) handleSupabaseError(error);
  return data;
}
```

### Searching Documents

```typescript
async function searchDocuments(query: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .or(`title.ilike.%${query}%,content::text.ilike.%${query}%`)
    .order('updated_at', { ascending: false });

  if (error) handleSupabaseError(error);
  return data;
}
```

---

## Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Row Level Security (RLS)

All API operations respect Supabase RLS policies:

- ✅ Users can only see documents they own or collaborate on
- ✅ Only owners can add/remove collaborators
- ✅ Only editors can modify content
- ✅ Viewers have read-only access

No need to manually check permissions in the frontend!

---

## Best Practices

1. **Always use the API services** instead of direct Supabase calls:
   ```typescript
   // ❌ Don't do this
   const { data } = await supabase.from('documents').select('*');
   
   // ✅ Do this
   const documents = await getUserDocuments();
   ```

2. **Handle errors gracefully**:
   ```typescript
   try {
     await createDocument('Title');
   } catch (error) {
     if (error instanceof PermissionError) {
       toast.error('You don't have permission');
     }
   }
   ```

3. **Use custom hooks for data fetching**:
   ```typescript
   // ✅ Automatic loading states and error handling
   const { documents, loading, error } = useDocuments();
   ```

4. **Clean up subscriptions**:
   ```typescript
   useEffect(() => {
     const unsubscribe = subscribeToDocument(id, callback);
     return () => unsubscribe(); // Always clean up!
   }, [id]);
   ```

---

## Type Safety

All operations are fully typed:

```typescript
// TypeScript knows the shape of the document
const doc: Document = await createDocument('Title');

// Auto-complete for all fields
console.log(doc.id, doc.title, doc.created_at);

// Type errors are caught at compile time
// ❌ This won't compile:
// await createDocument(123);
```

---

## Testing

```typescript
// Mock Supabase for testing
jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: mockDocuments,
        error: null,
      })),
    })),
  },
}));
```

---

## Performance Tips

1. **Use select() to fetch only needed fields**:
   ```typescript
   await supabase
     .from('documents')
     .select('id, title, updated_at') // Not full document
   ```

2. **Leverage Supabase caching** (automatic for most queries)

3. **Use real-time subscriptions** instead of polling

4. **Implement pagination** for large lists

---

## Troubleshooting

### "RLS policy violation"
- Check that the user is authenticated
- Verify the user has permission for the operation

### "User not authenticated"
- Ensure `supabase.auth.getUser()` returns a valid user
- Check that the auth token hasn't expired

### "Function not found"
- Verify the RPC functions exist in your Supabase database
- Check that you're using the correct function name

---

## Next Steps

1. Set up your Supabase project
2. Run the SQL migrations (from previous responses)
3. Update `.env.local` with your credentials
4. Start using the API services in your components!

For more details, see the [Supabase Documentation](https://supabase.com/docs).
