declare module 'emoji-dictionary' {
  export function getUnicode(name: string): string | undefined;
  export const emoji: { [name: string]: string };
  export const names: string[];
}
