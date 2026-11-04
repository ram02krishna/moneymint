const ICON_GRADIENTS = {
  "bg-purple-500": "from-purple-500 to-purple-700 shadow-purple-500/30",
  "bg-orange-500": "from-orange-400 to-orange-600 shadow-orange-500/30",
  "bg-red-500": "from-rose-500 to-red-600 shadow-rose-500/30",
  "bg-rose-500": "from-rose-500 to-red-600 shadow-rose-500/30",
  "bg-green-500": "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
  "bg-emerald-500": "from-emerald-400 to-emerald-600 shadow-emerald-500/30",
  "bg-blue-500": "from-blue-400 to-blue-600 shadow-blue-500/30",
};

// A static stat tile. Put several inside <div className="stat-grid stat-grid-3"> for the shared layout.
const InfoCard = ({ icon, label, value, color, hint, valueClassName }) => {
  const iconClasses = ICON_GRADIENTS[color] || "from-gray-400 to-gray-600 shadow-gray-500/20";
  const hasCustomSize = /text-(xs|sm|base|lg|xl|2xl|3xl)/.test(valueClassName || "");
  const isWrapping = /whitespace-normal|overflow-visible/.test(valueClassName || "");

  return (
    <div className="card flex items-center gap-5">
      <div
        className={`w-14 h-14 flex items-center justify-center text-2xl text-white rounded-2xl shrink-0 bg-linear-to-br shadow-lg ${iconClasses}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <div
          className={`${hasCustomSize ? "" : "text-2xl"} font-extrabold ${isWrapping ? "" : "truncate"} ${
            valueClassName || "text-gray-900 dark:text-white"
          }`}
        >
          {value}
        </div>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{hint}</p>}
      </div>
    </div>
  );
};

export default InfoCard;
