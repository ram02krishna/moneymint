import React from "react";

<<<<<<< HEAD
let InfoCard = ({ icon, label, value, color, hint }) => {
  let bgIcon = {
    "bg-purple-500": "from-purple-500 to-purple-700 shadow-purple-500/30",
    "bg-orange-500": "from-orange-400 to-orange-600 shadow-orange-500/30",
    "bg-red-500": "from-red-400 to-red-600 shadow-red-500/30",
    "bg-green-500": "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
    "bg-blue-500": "from-blue-400 to-blue-600 shadow-blue-500/30",
  };

  let iconClasses = bgIcon[color] || "from-gray-400 to-gray-600 shadow-gray-500/20";

  return (
    <div className="card card-interactive group flex items-center gap-5 p-6 w-[85vw] md:w-full shrink-0 snap-center">
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl text-white rounded-2xl flex-shrink-0 bg-linear-to-br shadow-lg
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          group-hover:scale-110 group-hover:-rotate-3 ${iconClasses}`}
=======
let InfoCard = ({ icon, label, value, color }) => {
  let bgIcon = {
    "bg-purple-500":
      "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    "bg-orange-500":
      "bg-orange-100 dark:bg-orange-900/40 text-orange-500 dark:text-orange-400",
    "bg-red-500":
      "bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400",
    "bg-green-500":
      "bg-green-100 dark:bg-green-900/40 text-green-500 dark:text-green-400",
    "bg-blue-500":
      "bg-blue-100 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400",
  };

  let iconClasses =
    bgIcon[color] ||
    "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";

  return (
    <div className="card card-interactive group flex items-center gap-5 p-6 w-[85vw] md:w-full shrink-0 snap-center">
      {/* Icon with hover scale + ring glow */}
      <div
        className={`w-12 h-12 flex items-center justify-center text-2xl rounded-xl flex-shrink-0
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          group-hover:scale-110 ${iconClasses}`}
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </p>
<<<<<<< HEAD
        <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate transition-colors duration-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {value}
        </h4>
        {hint && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
            {hint}
          </p>
        )}
=======
        <h4
          className="text-2xl font-bold text-gray-900 dark:text-white truncate
          transition-colors duration-200 group-hover:text-purple-600 dark:group-hover:text-purple-400"
        >
          {value}
        </h4>
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
      </div>
    </div>
  );
};

export default InfoCard;
