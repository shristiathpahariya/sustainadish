/**
 * Must stay in sync with `Backend/utils/recipeKey.js` for stable hashes.
 */
export function normalizeIngredientList(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients
      .map((i) => String(i).trim().toLowerCase())
      .filter(Boolean)
      .sort();
  }
  const s = String(ingredients ?? "").trim();
  if (!s) return [];
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

export async function buildRecipeKey(title, ingredients) {
  const t = String(title ?? "")
    .trim()
    .toLowerCase();
  const parts = normalizeIngredientList(ingredients);
  const payload = `${t}|${parts.join("|")}`;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
