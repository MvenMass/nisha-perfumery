// Склейка классов CSS Modules: ложные значения отбрасываются.
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
