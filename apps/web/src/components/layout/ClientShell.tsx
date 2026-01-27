'use client';

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from "@/components/providers/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function RouteGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            const isAuthPage = pathname === '/login' || pathname === '/signup';
            if (!user && !isAuthPage) {
                router.push('/login');
            } else if (user && isAuthPage) {
                router.push('/');
            }
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Determine if we should show the full layout (Navbar/Sidebar)
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-white dark:bg-black">
                    {children}
                </main>
            </div>
        </div>
    );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ErrorBoundary>
                <RouteGuard>{children}</RouteGuard>
            </ErrorBoundary>
        </AuthProvider>
    );
}
