/** Local placeholder when a donation has no photo or the image URL fails — no external requests. */
export const DONATION_IMAGE_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380" role="img" aria-label="No image">
  <rect fill="#e8e6df" width="600" height="380"/>
  <rect fill="none" stroke="#1a1a1a" stroke-width="2" x="1" y="1" width="598" height="378" opacity="0.15"/>
  <text x="300" y="185" text-anchor="middle" fill="#5f5e5a" font-family="Georgia,serif" font-size="15" font-style="italic">No photo</text>
  <text x="300" y="212" text-anchor="middle" fill="#888780" font-family="system-ui,sans-serif" font-size="11">Add one when you post a donation</text>
</svg>`
  );
