import { useState, useRef, useCallback } from "react";
import { ConfirmContext } from "./ConfirmContextDefinition";
import Modal from "../components/layouts/Modal";

const DEFAULTS = {
  title: "Are you sure?",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "danger",
};

export const ConfirmProvider = ({ children }) => {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOptions({ ...DEFAULTS, ...opts });
      }),
    [],
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
  };

  const view = options || DEFAULTS;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={!!options} onClose={() => settle(false)} title={view.title} maxWidth="max-w-md">
        {view.message && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{view.message}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <button type="button" className="btn-secondary" onClick={() => settle(false)}>
            {view.cancelLabel}
          </button>
          <button
            type="button"
            className={view.tone === "danger" ? "btn-danger" : "btn-primary !w-auto !my-0"}
            onClick={() => settle(true)}
          >
            {view.confirmLabel}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};
