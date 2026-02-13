'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
            <div className="max-w-md w-full space-y-8 bg-[var(--navbar-bg)] p-8 rounded-2xl border shadow-xl">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-white font-bold text-2xl">S</span>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Welcome Back</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to continue to SynkDocs
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account? </span>
                    <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                        Sign up for free
                    </Link>
                </div>
            </div>
        </div>
    );
}
