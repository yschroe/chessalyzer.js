import { llms } from 'fumadocs-core/source';

import { source } from '@/lib/source';

export function GET() {
    return new Response(llms(source).index());
}

export async function getConfig() {
    return {
        render: 'static' as const,
    } as const;
}
