import { useEffect, useId, useRef } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// Accessible dialog: closes on Escape / backdrop click, locks page scroll while open,
// bounded to viewport height with pinned header and smooth internal scrolling.
const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  maxWidth = "max-w-2xl",
}) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  // callers usually pass an inline function; a ref keeps the effect from re-running on every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);

    // move focus into the dialog (first field if there is one) and give it back on close
    const frame = requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector("input:not([type=hidden]), select, textarea") || dialogRef.current;
      target?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[100] flex justify-center items-center overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 bg-gray-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative w-full ${maxWidth} my-auto outline-none`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden">
              <div className="flex items-center justify-between px-5 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-3xl shrink-0">
                <h3 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white truncate pr-2">
                  {title}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-9 h-9 inline-flex shrink-0 justify-center items-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                  </svg>
                </button>
              </div>
              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
