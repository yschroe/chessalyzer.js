import type { ReactNode } from 'react';

import { Provider } from '@/components/provider';

import '@/styles/globals.css';

export default async function RootElement({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head></head>
            <body data-version="1.0" className="flex min-h-screen flex-col">
                <Provider>{children}</Provider>
            </body>
        </html>
    );
}

export async function getConfig() {
    return {
        render: 'static',
    } as const;
}
