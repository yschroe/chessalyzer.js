import { Link } from 'fumadocs-core/link';

import './home.css';

function HeroBoard() {
    const files = 14;
    const ranks = 14;
    // Soft heatmap-style intensity on a few squares (library vibe, not uniform checker)
    const heat: Record<string, number> = {
        '6-5': 0.55,
        '6-6': 0.75,
        '7-5': 0.7,
        '7-6': 0.95,
        '5-6': 0.4,
        '8-5': 0.45,
        '7-7': 0.5,
        '8-6': 0.6,
        '5-5': 0.3,
        '6-4': 0.35,
    };

    return (
        <svg
            className="home-hero-board absolute inset-0 size-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="boardWash" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1f4a38" stopOpacity="0.9" />
                    <stop offset="55%" stopColor="#163528" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#0f241c" stopOpacity="1" />
                </linearGradient>

                <radialGradient id="boardGlow" cx="48%" cy="42%" r="55%">
                    <stop offset="0%" stopColor="#c8a24a" stopOpacity="0.22" />
                    <stop offset="55%" stopColor="#2d6b4f" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#0f241c" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="readability" x1="0%" y1="50%" x2="75%" y2="50%">
                    <stop offset="0%" stopColor="#0c1a14" stopOpacity="0.72" />
                    <stop offset="45%" stopColor="#0c1a14" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#0c1a14" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* <rect width="800" height="800" fill="url(#boardWash)" /> */}

            {Array.from({ length: ranks }, (_, rank) =>
                Array.from({ length: files }, (_, file) => {
                    const light = (file + rank) % 2 === 0;
                    const key = `${file}-${rank}`;
                    const intensity = heat[key] ?? 0;
                    const size = 80;
                    const x = file * size;
                    const y = rank * size;
                    return (
                        <g key={key}>
                            <rect
                                x={x}
                                y={y}
                                width={size}
                                height={size}
                                fill={light ? '#DC91' : '#6421'}
                            />
                            {intensity > 0 ? (
                                <rect
                                    x={x}
                                    y={y}
                                    width={size}
                                    height={size}
                                    fill="#FA0"
                                    opacity={intensity * 0.4}
                                />
                            ) : null}
                        </g>
                    );
                }),
            )}
        </svg>
    );
}

export default function Home() {
    return (
        <div className="home-page relative isolate flex flex-1 flex-col overflow-hidden border-fd-muted sm:m-4 sm:rounded-lg sm:border sm:border-fd-border">
            <HeroBoard />

            <div className="absolute inset-0 z-10"></div>

            <div className="z-10 flex flex-1 flex-col justify-center">
                <div className="px-6 py-24 sm:px-10 lg:px-36">
                    <p className="home-brand mb-5 text-5xl font-semibold tracking-tight text-fd-foreground sm:text-6xl md:text-7xl">
                        Chessalyzer
                    </p>

                    <h1 className="home-headline mb-4 max-w-lg text-2xl leading-snug font-medium text-fd-foreground sm:text-3xl md:text-4xl">
                        Batch-analyze chess games at scale
                    </h1>

                    <p className="home-lede mb-8 max-w-xl text-base leading-relaxed text-fd-foreground sm:text-lg">
                        Parse large PGN databases and run modular trackers — fast, parallel, and
                        dependency-free.
                    </p>

                    <div className="home-cta flex flex-wrap items-center gap-4">
                        <Link
                            href="/docs"
                            className="inline-flex items-center rounded bg-orange-300 px-5 py-3 text-sm font-semibold text-gray-800 transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                        >
                            Open Docs
                        </Link>
                        <a
                            href="https://github.com/yschroe/chessalyzer"
                            className="text-sm font-medium text-fd-foreground underline-offset-4 hover:underline"
                        >
                            View on GitHub
                        </a>
                    </div>
                </div>

                <div className="mx-auto mt-auto p-6 font-sans">
                    <p className="text-xs leading-relaxed text-fd-foreground">
                        Most of this documentation was AI-generated and will be overhauled before
                        the final release. Treat it as a draft while the API settles.
                    </p>
                </div>
            </div>
        </div>
    );
}

export async function getConfig() {
    return {
        render: 'static',
    };
}
