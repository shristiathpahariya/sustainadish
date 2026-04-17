import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "../messageDialog.css";

const MessageDialogContext = createContext(null);

function MessageDialogPortal({ state, onDismiss, onConfirmAction }) {
  const { open, variant, title, message, confirmLabel } = state;
  const isConfirm = variant === "confirm";
  const primaryLabel = typeof confirmLabel === "string" && confirmLabel.trim() ? confirmLabel.trim() : "Remove";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const panelClass = `app-message-panel app-message-panel--${variant}`;

  return createPortal(
    <div
      className="app-message-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-message-title"
      onClick={onDismiss}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="app-message-panel__accent" aria-hidden />
        <button
          type="button"
          className="app-message-close"
          onClick={onDismiss}
          aria-label={isConfirm ? "Cancel" : "Close"}
        >
          ×
        </button>
        <h2 id="app-message-title" className="app-message-title">
          {title}
        </h2>
        <p className="app-message-body">{message}</p>
        {isConfirm ? (
          <div className="app-message-actions app-message-actions--split">
            <button
              type="button"
              className="app-message-btn app-message-btn--ghost"
              onClick={onDismiss}
            >
              Cancel
            </button>
            <button
              type="button"
              className="app-message-btn app-message-btn--danger"
              onClick={onConfirmAction}
            >
              {primaryLabel}
            </button>
          </div>
        ) : (
          <div className="app-message-actions">
            <button type="button" className="app-message-btn" onClick={onDismiss}>
              OK
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function MessageDialogProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    variant: "info",
    title: "",
    message: "",
    confirmLabel: "Remove",
  });
  const confirmResolverRef = useRef(null);

  const dismiss = useCallback(() => {
    setState((s) => {
      if (s.open && s.variant === "confirm" && confirmResolverRef.current) {
        const fn = confirmResolverRef.current;
        confirmResolverRef.current = null;
        queueMicrotask(() => fn(false));
      }
      return { ...s, open: false };
    });
  }, []);

  const confirmAction = useCallback(() => {
    const fn = confirmResolverRef.current;
    confirmResolverRef.current = null;
    if (fn) fn(true);
    setState((s) => ({ ...s, open: false }));
  }, []);

  const notifySuccess = useCallback((message, title = "Success") => {
    setState({
      open: true,
      variant: "success",
      title,
      message: String(message),
      confirmLabel: "Remove",
    });
  }, []);

  const notifyError = useCallback((message, title = "Something went wrong") => {
    setState({
      open: true,
      variant: "error",
      title,
      message: String(message),
      confirmLabel: "Remove",
    });
  }, []);

  const notifyInfo = useCallback((message, title = "Notice") => {
    setState({
      open: true,
      variant: "info",
      title,
      message: String(message),
      confirmLabel: "Remove",
    });
  }, []);

  /** Promise resolves `true` if user confirms, `false` if cancelled or dismissed. Optional `{ confirmLabel }` for the primary button. */
  const notifyConfirm = useCallback((message, title = "Confirm", options = {}) => {
    const label =
      typeof options.confirmLabel === "string" && options.confirmLabel.trim()
        ? options.confirmLabel.trim()
        : "Remove";
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setState({
        open: true,
        variant: "confirm",
        title,
        message: String(message),
        confirmLabel: label,
      });
    });
  }, []);

  const value = useMemo(
    () => ({
      notifySuccess,
      notifyError,
      notifyInfo,
      notifyConfirm,
      close: dismiss,
    }),
    [notifySuccess, notifyError, notifyInfo, notifyConfirm, dismiss]
  );

  return (
    <MessageDialogContext.Provider value={value}>
      {children}
      <MessageDialogPortal state={state} onDismiss={dismiss} onConfirmAction={confirmAction} />
    </MessageDialogContext.Provider>
  );
}

export function useMessageDialog() {
  const ctx = useContext(MessageDialogContext);
  if (!ctx) {
    throw new Error("useMessageDialog must be used within MessageDialogProvider");
  }
  return ctx;
}
