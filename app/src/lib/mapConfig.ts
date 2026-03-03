const DEFAULT_MAP_TILE_URL_TEMPLATE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_MAP_TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

const readEnvValue = (key: string) =>
  (import.meta.env as Record<string, string | undefined>)[key]?.trim() || undefined;

const normalizeSubdomainTemplate = (template: string, subdomain: string) =>
  template.replace("{s}", subdomain);

const extractOrigin = (template: string) => {
  try {
    const normalizedTemplate = template.includes("{s}")
      ? normalizeSubdomainTemplate(template, "a")
      : template;

    return new URL(normalizedTemplate).origin;
  } catch {
    return null;
  }
};

export const MAP_TILE_URL_TEMPLATE =
  readEnvValue("VITE_MAP_TILE_URL_TEMPLATE") || DEFAULT_MAP_TILE_URL_TEMPLATE;

export const MAP_TILE_ATTRIBUTION =
  readEnvValue("VITE_MAP_TILE_ATTRIBUTION") || DEFAULT_MAP_TILE_ATTRIBUTION;

export const MAP_TILE_ALLOWED_ORIGINS = (() => {
  if (!MAP_TILE_URL_TEMPLATE.includes("{s}")) {
    const origin = extractOrigin(MAP_TILE_URL_TEMPLATE);
    return origin ? [origin] : [];
  }

  const origins = ["a", "b", "c"]
    .map((subdomain) => extractOrigin(normalizeSubdomainTemplate(MAP_TILE_URL_TEMPLATE, subdomain)))
    .filter((origin): origin is string => origin != null);

  return [...new Set(origins)];
})();
