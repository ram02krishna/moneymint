import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

const Modal = ({ children, isOpen, onClose, title }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;
  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[100] flex justify-center items-center overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
        isVisible
          ? "bg-gray-900/60 backdrop-blur-sm opacity-100"
          : "bg-transparent backdrop-blur-none opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }
      }}
    >
      <div
        className={`relative p-4 md:p-6 w-full max-w-2xl mx-auto transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isVisible
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-3xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>

            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-10 h-10 inline-flex flex-shrink-0 justify-center items-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              aria-label="Close modal"
            >
              <svg
                className="w-4 h-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>

          <div className="p-6 md:p-8">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
