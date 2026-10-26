import React from "react";
import {
  LuTrendingUp,
  LuTrendingDown,
  LuTrash2,
  LuUtensils,
} from "react-icons/lu";

const TransactionInfoCard = ({
  title,
  category,
  icon,
  date,
  amount,
  type,
  hideDeleteBtn = false,
  onDelete,
}) => {
  const getAmountStyle = () =>
    type === "income"
      ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-semibold"
      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold";

  return (
    <div className="group relative flex items-center gap-4 mt-2 rounded-xl transition-all duration-200 cursor-default border border-transparent">
      <div className="w-12 h-12 flex items-center justify-center text-xl text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {icon ? (
          <img src={icon} alt={title} className="w-6 h-6 object-contain" />
        ) : (
          <LuUtensils />
        )}
      </div>

      <div className="flex-1 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-900 dark:text-white font-medium">
            {title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {category}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {date}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!hideDeleteBtn && (
          <button
            className="p-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
            onClick={onDelete}
          >
            <LuTrash2 size={18} />
          </button>
        )}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${getAmountStyle()}`}
        >
          <h6 className="">
            {type === "income" ? "+" : "-"} ₹{amount}
          </h6>
          {type === "income" ? <LuTrendingUp /> : <LuTrendingDown />}
        </div>
      </div>
    </div>
  );
};

export default TransactionInfoCard;
