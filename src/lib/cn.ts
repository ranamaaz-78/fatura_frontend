export function cn(...classes: Array<string | number | bigint | boolean | null | undefined>): string {
  return classes.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ')
}
