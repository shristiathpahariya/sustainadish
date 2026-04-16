import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "../messageDialog.css";

const MessageDialogContext = createContext(null);

function MessageDialogPortal({ state, onClose }) {
  const { open, variant, title, message } = state;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      onClick={onClose}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="app-message-panel__accent" aria-hidden />
        <button
          type="button"
          className="app-message-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="app-message-title" className="app-message-title">
          {title}
        </h2>
        <p className="app-message-body">{message}</p>
        <div className="app-message-actions">
          <button type="button" className="app-message-btn" onClick={onClose}>
            OK
          </button>
        </div>
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
  });

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const notifySuccess = useCallback((message, title = "Success") => {
    setState({
      open: true,
      variant: "success",
      title,
      message: String(message),
    });
  }, []);

  const notifyError = useCallback((message, title = "Something went wrong") => {
    setState({
      open: true,
      variant: "error",
      title,
      message: String(message),
    });
  }, []);

  const notifyInfo = useCallback((message, title = "Notice") => {
    setState({
      open: true,
      variant: "info",
      title,
      message: String(message),
    });
  }, []);

  const value = useMemo(
    () => ({ notifySuccess, notifyError, notifyInfo, close }),
    [notifySuccess, notifyError, notifyInfo, close]
  );

  return (
    <MessageDialogContext.Provider value={value}>
      {children}
      <MessageDialogPortal state={state} onClose={close} />
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
