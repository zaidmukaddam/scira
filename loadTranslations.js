
export default async function loadTranslations(locale) {
  try {
    // Load translations from public/_gt directory
    // This matches the GT config files.gt.output path
    const t = await import(`./public/_gt/${locale}.json`);
    return t.default;
  } catch (error) {
    console.warn(`Failed to load translations for locale ${locale}:`, error);
    return {};
  }
}
