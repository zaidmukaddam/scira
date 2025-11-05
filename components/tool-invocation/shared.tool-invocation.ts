export function sanitizeCssVariableName(label: string) {
  return label.replaceAll(' ', '').toLowerCase().replace(/[^a-z0-9\-_]/g, '_');
}
