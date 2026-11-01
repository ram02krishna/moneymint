import React from "react";
import { LuTrendingUp, LuTrendingDown, LuTrash2 } from "react-icons/lu";
import { emojiFor, capitalize, addThousandsSeparator } from "../../utils/helper";

const TransactionInfoCard = ({
  title,
  category,
  source,
  date,
  amount,
  type,
  hideDeleteBtn = false,
  onDelete,
}) => {
  const isIncome = type === "income";
  const cat = category || source || "";
  const emoji = emojiFor(`${cat} ${title || ""}`, type);

  return (
    <div className="group relative flex items-center gap-3.5 p-2 rounded-xl transition-all duration-200 cursor-default hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
      <div
        className={`w-12 h-12 flex-shrink-0 flex items-center justify-center text-2xl rounded-2xl transition-transform duration-200 group-hover:scale-105 ${
          isIncome
            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
        }`}
      >
        <span>{emoji}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {cat ? `${capitalize(cat)} · ` : ""}{date}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!hideDeleteBtn && (
          <button
            className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onDelete}
            title="Delete transaction"
          >
            <LuTrash2 size={16} />
          </button>
        )}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
            isIncome
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
          }`}
        >
          <span>
            {isIncome ? "+" : "-"} ₹{addThousandsSeparator(amount)}
          </span>
          {isIncome ? (
            <LuTrendingUp className="text-emerald-500" />
          ) : (
            <LuTrendingDown className="text-rose-500" />
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionInfoCard;
