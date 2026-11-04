import { LuPencil, LuTrash2 } from "react-icons/lu";
import { emojiFor, formatCurrency, formatDate } from "../../utils/helper";

// Rows from the combined feed carry their own `type`; rows from the Income/Expense pages use the `type` prop.
const kindOf = (item, fallback) => item.type || (item.source ? "income" : fallback);

const HEAD = "px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider";

const TransactionsTable = ({ data, onEdit, onDelete, showActions = true, type = "income" }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No transactions to show</div>;
  }

  return (
    <div className="overflow-x-auto no-scrollbar w-full max-w-full">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className={HEAD}>
              Details
            </th>
            <th scope="col" className={`hidden md:table-cell ${HEAD}`}>
              Date
            </th>
            <th scope="col" className={HEAD}>
              Amount
            </th>
            {showActions && (
              <th scope="col" className="relative px-3 md:px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item) => {
            const kind = kindOf(item, type);
            const isIncome = kind === "income";

            return (
              <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className={`shrink-0 h-10 w-10 text-xl flex items-center justify-center rounded-xl ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}
                      aria-hidden="true"
                    >
                      {emojiFor(`${item.category || item.source || ""} ${item.title || ""}`, kind)}
                    </div>
                    <div className="ml-3 md:ml-4 max-w-[140px] sm:max-w-[200px] md:max-w-none">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.category || item.source}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {formatDate(item.date)}
                </td>
                <td
                  className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isIncome ? "+" : "-"} {formatCurrency(item.amount)}
                </td>
                {showActions && (
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => onEdit(item)} className="icon-btn" aria-label={`Edit ${item.title}`}>
                        <LuPencil className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item._id)}
                        className="icon-btn icon-btn-danger"
                        aria-label={`Delete ${item.title}`}
                      >
                        <LuTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionsTable;
