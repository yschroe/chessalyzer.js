import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';
import wasm from 'takumi-js/wasm';
import { ImageResponse } from 'takumi-js/response';
import { ApiContext } from 'waku/router';

import { appName } from '@/lib/shared';
import { source } from '@/lib/source';

export async function GET(_: Request, { params }: ApiContext<'/og/docs/[...slugs]/image.webp'>) {
    const page = source.getPage(params.slugs);

    if (!page) return new Response(undefined, { status: 404 });

    return new ImageResponse(
        <DefaultImage title={page.data.title} description={page.data.description} site={appName} />,
        {
            width: 1200,
            height: 630,
            format: 'webp',
            module: wasm,
        },
    );
}

export async function getConfig() {
    const pages = source
        .generateParams()
        .map((item) => (item.lang ? [item.lang, ...item.slug] : item.slug));

    return {
        render: 'static' as const,
        staticPaths: pages,
    } as const;
}
