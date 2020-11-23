declare const _exports: {
    [n: number]: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    length: number;
    toString(): string;
    toLocaleString(): string;
    pop(): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    push(...items: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]): number;
    concat(...items: ConcatArray<{
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>[]): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    concat(...items: ({
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    } | ConcatArray<{
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>)[]): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    join(separator?: string): string;
    reverse(): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    shift(): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    slice(start?: number, end?: number): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    sort(compareFn?: (a: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, b: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }) => number): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    splice(start: number, deleteCount?: number): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    splice(start: number, deleteCount: number, ...items: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    unshift(...items: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]): number;
    indexOf(searchElement: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, fromIndex?: number): number;
    lastIndexOf(searchElement: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, fromIndex?: number): number;
    every<S extends {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => value is S, thisArg?: any): this is S[];
    every(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => unknown, thisArg?: any): boolean;
    some(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => unknown, thisArg?: any): boolean;
    forEach(callbackfn: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => void, thisArg?: any): void;
    map<U>(callbackfn: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => U, thisArg?: any): U[];
    filter<S_1 extends {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => value is S_1, thisArg?: any): S_1[];
    filter(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => unknown, thisArg?: any): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    reduce(callbackfn: (previousValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    reduce(callbackfn: (previousValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, initialValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    reduce<U_1>(callbackfn: (previousValue: U_1, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => U_1, initialValue: U_1): U_1;
    reduceRight(callbackfn: (previousValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    reduceRight(callbackfn: (previousValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, initialValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    reduceRight<U_2>(callbackfn: (previousValue: U_2, currentValue: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, currentIndex: number, array: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => U_2, initialValue: U_2): U_2;
    find<S_2 extends {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>(predicate: (this: void, value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, obj: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => value is S_2, thisArg?: any): S_2;
    find(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, obj: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => unknown, thisArg?: any): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    };
    findIndex(predicate: (value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, index: number, obj: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[]) => unknown, thisArg?: any): number;
    fill(value: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, start?: number, end?: number): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    copyWithin(target: number, start: number, end?: number): {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }[];
    [Symbol.iterator](): IterableIterator<{
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>;
    entries(): IterableIterator<[number, {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }]>;
    keys(): IterableIterator<number>;
    values(): IterableIterator<{
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }>;
    [Symbol.unscopables](): {
        copyWithin: boolean;
        entries: boolean;
        fill: boolean;
        find: boolean;
        findIndex: boolean;
        keys: boolean;
        values: boolean;
    };
    includes(searchElement: {
        short_name: string;
        long_name: string;
        type: string;
        scope: string;
        unit: string;
        description: string;
        calc: (data: any, sqrData: any, loopSqrData: any) => any;
    }, fromIndex?: number): boolean;
};
export = _exports;
