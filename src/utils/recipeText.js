export function splitIngredients(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function splitInstructions(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  const s = String(raw).trim();
  if (!s) return [];
  const bySentence = s
    .replace(/\d+\.\s/g, "")
    .split(/[.!?]\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
  if (bySentence.length > 1) return bySentence;
  const byLine = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return [s];
}
