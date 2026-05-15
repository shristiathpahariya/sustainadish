import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../config';

const CONSENT_KEY = 'foodapp_locationConsent';

/** Chrome et al.: PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3 */
function geoFailureMessage(err) {
  const code = err && typeof err.code === 'number' ? err.code : null;
  if (code === 1) {
    return (
      'The browser blocked location for this site (no prompt usually means it was blocked before). ' +
      'Chrome/Edge: click the lock icon left of the address bar → Site settings → Location → Allow, then reload. ' +
      'Or use landmark search below.'
    );
  }
  if (code === 3) {
    return (
      'Location timed out. Try again near a window, allow “precise location” if asked, ' +
      'or use landmark search below.'
    );
  }
  if (code === 2) {
    return (
      'Could not determine your position (GPS/network). The Google 403 line in the console is from the browser’s ' +
      'network location helper—not your app. Try landmark search, or reload and retry GPS outdoors.'
    );
  }
  return 'Location failed. Try landmark search instead.';
}

function getSecureContextBlockedMessage() {
  if (typeof window === 'undefined') return '';
  if (window.isSecureContext) return '';
  const h = window.location.hostname || '';
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return '';
  return (
    'GPS is turned off for this URL: browsers only allow geolocation on HTTPS or http://localhost. ' +
    'Open the app as http://localhost:5173 on this PC (not http://192.168.x.x or a raw LAN IP), or use HTTPS. ' +
    'You can still use landmark search.'
  );
}

function getCurrentPositionAsync(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export default function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(
    () => localStorage.getItem(CONSENT_KEY) === 'true'
  );
  const [permissionState, setPermissionState] = useState(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined;
    let permStatus;
    const onChange = () => {
      if (permStatus) setPermissionState(permStatus.state);
    };
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        permStatus = status;
        setPermissionState(status.state);
        status.addEventListener('change', onChange);
      })
      .catch(() => setPermissionState(null));
    return () => {
      if (permStatus) permStatus.removeEventListener('change', onChange);
    };
  }, []);

  const recordConsent = useCallback(async () => {
    try {
      await apiClient.post('/user/location-consent');
    } catch (_) {
      /* non-fatal */
    }
    localStorage.setItem(CONSENT_KEY, 'true');
    setConsentGiven(true);
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    const blocked = getSecureContextBlockedMessage();
    if (blocked) {
      setError(blocked);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let position;
      try {
        position = await getCurrentPositionAsync({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 120000,
        });
      } catch (firstErr) {
        if (firstErr && firstErr.code === 1) throw firstErr;
        position = await getCurrentPositionAsync({
          enableHighAccuracy: false,
          timeout: 18000,
          maximumAge: 120000,
        });
      }
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (err) {
      setError(geoFailureMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    coords,
    error,
    loading,
    consentGiven,
    requestLocation,
    recordConsent,
    /** 'granted' | 'denied' | 'prompt' | null if unsupported */
    permissionState,
    secureContextBlockedMessage: getSecureContextBlockedMessage(),
  };
}
