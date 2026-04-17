let gsiLoadPromise = null;

/** Load https://accounts.google.com/gsi/client once (Google Identity Services). */
export function loadGsiScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  gsiLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (window.google?.accounts?.id) resolve();
      else reject(new Error("Google Identity Services not available"));
    };
    s.onerror = () => reject(new Error("Failed to load Google sign-in script"));
    document.head.appendChild(s);
  });

  return gsiLoadPromise;
}
