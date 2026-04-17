import React, { useEffect, useRef } from "react";
import { loadGsiScript } from "../utils/loadGsi";
import { decodeJwtPayload } from "../utils/jwtPayload";

/**
 * Google Identity Services (replaces deprecated gapi.auth2 / iframerpc).
 * Renders the official "Continue with Google" button.
 */
export default function GoogleSignInButton({ clientId, onSuccess, className = "" }) {
  const divRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !divRef.current) return;

        const google = window.google;
        divRef.current.innerHTML = "";

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const payload = decodeJwtPayload(response.credential);
            if (!payload?.email) {
              console.error("[GoogleSignIn] ID token missing email claim");
              return;
            }
            onSuccessRef.current({
              email: payload.email,
              name: typeof payload.name === "string" ? payload.name : "",
              profilePicture: typeof payload.picture === "string" ? payload.picture : "",
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.renderButton(divRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 320,
        });
      } catch (e) {
        console.error("[GoogleSignIn]", e);
      }
    })();

    return () => {
      cancelled = true;
      if (divRef.current) divRef.current.innerHTML = "";
    };
  }, [clientId]);

  if (!clientId) return null;

  return <div className={className} ref={divRef} />;
}
