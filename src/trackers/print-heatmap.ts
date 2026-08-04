import type { HeatmapData } from '#trackers/heatmap-types';

/** Black foreground on a truecolor RGB background (ANSI). */
function styleBgRgb(r: number, g: number, b: number, text: string): string {
    return `\x1b[30;48;2;${r};${g};${b}m${text}\x1b[0m`;
}

function renderHeatmap(data: HeatmapData, write: (chunk: string) => void): void {
    const color1 = [255, 128, 0];
    const color2 = [0, 128, 255];
    const bgColor = [255, 255, 255];
    const largestVal = Math.max(data.max, Math.abs(data.min));

    for (const row of data.map) {
        for (let cnt = 0; cnt < 2; cnt += 1) {
            for (const cellVal of row) {
                let val = cellVal;
                let color = color1;

                if (val < 0) {
                    val = Math.abs(val);
                    color = color2;
                }

                const alpha = data.max === 0 ? 0 : Math.sqrt(val / largestVal);
                const c0 = color[0] ?? 0;
                const c1 = color[1] ?? 0;
                const c2 = color[2] ?? 0;
                const bg0 = bgColor[0] ?? 255;
                const bg1 = bgColor[1] ?? 255;
                const bg2 = bgColor[2] ?? 255;
                const colorOut = [
                    Math.round(c0 * alpha + (1 - alpha) * bg0),
                    Math.round(c1 * alpha + (1 - alpha) * bg1),
                    Math.round(c2 * alpha + (1 - alpha) * bg2),
                ];

                const [outR = 0, outG = 0, outB = 0] = colorOut;
                write(styleBgRgb(outR, outG, outB, '    '));
            }

            write('\n');
        }
    }
}

/** Render {@link HeatmapData} as an ANSI-colored string (same output as {@link printHeatmap}). */
export function heatmapToString(data: HeatmapData): string {
    const parts: string[] = [];
    renderHeatmap(data, (chunk) => {
        parts.push(chunk);
    });
    return parts.join('');
}

/** Print {@link HeatmapData} to the terminal. */
export function printHeatmap(data: HeatmapData): void {
    renderHeatmap(data, (chunk) => {
        process.stdout.write(chunk);
    });
}
