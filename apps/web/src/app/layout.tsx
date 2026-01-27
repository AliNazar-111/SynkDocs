import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "SynkDocs - Real-time Collaborative Editing",
    description: "A production-ready real-time collaborative document editor.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ClientShell>{children}</ClientShell>
            </body>
        </html>
    );
}
