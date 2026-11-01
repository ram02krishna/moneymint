import React from "react";

let LoadingSpinner = ({
  fullScreen = false,
  text = "Loading...",
  size = "medium",
}) => {
  let sizeMap = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  let spinnerSize = sizeMap[size] || sizeMap.medium;

  let spinner = (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`${spinnerSize} animate-spin rounded-full border-4 border-purple-100 dark:border-gray-700 border-t-purple-600`}
      ></div>
      {text && <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
