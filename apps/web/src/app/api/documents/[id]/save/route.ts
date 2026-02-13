import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

/**
 * API route for sendBeacon saves (when user closes tab)
 * This needs to handle application/json from sendBeacon
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const documentId = params.id;

        // Get auth session from cookies
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const body = await request.json();
        const { content, title } = body;

        // Update document in Supabase
        const { error } = await supabase
            .from('documents')
            .update({
                content,
                title,
                updated_at: new Date().toISOString(),
            })
            .eq('id', documentId);

        if (error) {
            console.error('Save error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
