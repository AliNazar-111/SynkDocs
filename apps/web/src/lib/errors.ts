// Custom error classes for better error handling
export class SupabaseError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'SupabaseError';
    }
}

export class AuthenticationError extends SupabaseError {
    constructor(message = 'Authentication required') {
        super(message, 'AUTH_REQUIRED');
        this.name = 'AuthenticationError';
    }
}

export class PermissionError extends SupabaseError {
    constructor(message = 'Permission denied') {
        super(message, 'PERMISSION_DENIED');
        this.name = 'PermissionError';
    }
}

export class NotFoundError extends SupabaseError {
    constructor(resource: string) {
        super(`${resource} not found`, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

// Error handler utility
export function handleSupabaseError(error: any): never {
    console.error('Supabase error:', error);

    // Handle specific Postgres error codes
    if (error.code) {
        switch (error.code) {
            case '42501': // insufficient_privilege
            case 'PGRST301': // RLS policy violation
                throw new PermissionError(error.message);

            case '23505': // unique_violation
                throw new SupabaseError('Resource already exists', error.code, error);

            case '23503': // foreign_key_violation
                throw new SupabaseError('Referenced resource not found', error.code, error);

            case 'PGRST116': // No rows returned
                throw new NotFoundError('Resource');

            default:
                throw new SupabaseError(
                    error.message || 'An unexpected error occurred',
                    error.code,
                    error
                );
        }
    }

    // Handle auth errors
    if (error.status === 401) {
        throw new AuthenticationError();
    }

    // Generic error
    throw new SupabaseError(error.message || 'An unexpected error occurred');
}

// Result wrapper type
export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: SupabaseError };

// Async result wrapper
export async function wrapAsync<T>(
    promise: Promise<T>
): Promise<Result<T>> {
    try {
        const data = await promise;
        return { success: true, data };
    } catch (error) {
        if (error instanceof SupabaseError) {
            return { success: false, error };
        }
        return {
            success: false,
            error: new SupabaseError(
                error instanceof Error ? error.message : 'Unknown error'
            ),
        };
    }
}
