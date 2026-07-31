import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';

import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: { children: ReactNode }) {
    return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}

export async function getConfig() {
    return {
        render: 'static' as const,
    } as const;
}
