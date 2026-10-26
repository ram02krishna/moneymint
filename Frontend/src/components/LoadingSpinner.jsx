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
<<<<<<< HEAD
        className={`${spinnerSize} animate-spin rounded-full border-4 border-purple-100 dark:border-gray-700 border-t-purple-600`}
      ></div>
      {text && <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm font-medium">{text}</p>}
=======
        className={`${spinnerSize} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`}
      ></div>
      {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
    </div>
  );

  if (fullScreen) {
    return (
<<<<<<< HEAD
      <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50">
=======
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
