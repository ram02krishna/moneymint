import React from "react";

let InfoCard = ({ icon, label, value, color, hint }) => {
  let bgIcon = {
    "bg-purple-500": "from-purple-500 to-purple-700 shadow-purple-500/30",
    "bg-orange-500": "from-orange-400 to-orange-600 shadow-orange-500/30",
    "bg-red-500": "from-rose-500 to-red-600 shadow-rose-500/30",
    "bg-rose-500": "from-rose-500 to-red-600 shadow-rose-500/30",
    "bg-green-500": "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
    "bg-emerald-500": "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
    "bg-blue-500": "from-blue-400 to-blue-600 shadow-blue-500/30",
  };

  let iconClasses = bgIcon[color] || "from-gray-400 to-gray-600 shadow-gray-500/20";

  return (
    <div className="card card-interactive group flex items-center gap-5 p-6 w-[85vw] md:w-full shrink-0 snap-center">
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl text-white rounded-2xl flex-shrink-0 bg-linear-to-br shadow-lg
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          group-hover:scale-110 group-hover:-rotate-3 ${iconClasses}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </p>
        <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate transition-colors duration-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
          {value}
        </h4>
        {hint && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
};

export default InfoCard;
