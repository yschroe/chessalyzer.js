/**
 * Extend a string union so callers can accept future literal values without a type error.
 * Use for semver-extensible discriminant fields documented as open unions.
 */
export type OpenUnion<T extends string> = T | (string & {});
