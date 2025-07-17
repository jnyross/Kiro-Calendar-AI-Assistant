declare module 'vcard-parser' {
  export interface VCardProperty {
    value: string;
    type?: string;
    params?: Record<string, string>;
  }

  export interface VCard {
    version?: VCardProperty[];
    fn?: VCardProperty[];
    n?: VCardProperty[];
    email?: VCardProperty[];
    tel?: VCardProperty[];
    org?: VCardProperty[];
    title?: VCardProperty[];
    note?: VCardProperty[];
    adr?: VCardProperty[];
    url?: VCardProperty[];
    [key: string]: VCardProperty[] | undefined;
  }

  export function parse(vCardText: string): VCard[];
}