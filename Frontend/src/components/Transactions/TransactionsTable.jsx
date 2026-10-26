import React from "react";
import moment from "moment";
import { LuPencil, LuTrash2 } from "react-icons/lu";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const TransactionsTable = ({
  data,
  onEdit,
  onDelete,
  showActions = true,
  type = "income",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar w-full max-w-full">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th
              scope="col"
              className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Details
            </th>
            <th
              scope="col"
              className="hidden md:table-cell px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-3 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              Amount
            </th>
            {showActions && (
              <th scope="col" className="relative px-3 md:px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item) => (
            <tr
              key={item._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 text-2xl flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {item.icon ? (
                      item.icon.includes("/") || item.icon.includes(".") ? (
                        <img
                          src={item.icon}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.innerText = "💰";
                          }}
                        />
                      ) : (
                        <span>{item.icon}</span>
                      )
                    ) : (
                      <span>
                        {type === "expense" ||
                        item.type === "expense" ||
                        (!item.source && !item.type && !type)
                          ? "💸"
                          : "💰"}
                      </span>
                    )}
                  </div>
                  <div className="ml-3 md:ml-4 max-w-[140px] sm:max-w-[200px] md:max-w-none">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {/* Handle inconsistent naming: income uses 'source', expense uses 'category' */}
                      {item.category || item.source}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden md:table-cell px-3 md:px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  {moment(item.date).format("DD/MM/YYYY")}
                </div>
              </td>
              <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                <div
                  className={`text-sm font-semibold ${
                    type === "expense" ||
                    item.type === "expense" ||
                    (!item.source && !item.type && !type)
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {type === "expense" ||
                  item.type === "expense" ||
                  (!item.source && !item.type && !type)
                    ? "-"
                    : "+"}{" "}
                  {formatCurrency(item.amount)}
                </div>
              </td>
              {showActions && (
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      title="Edit"
                    >
                      <LuPencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(item._id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <LuTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionsTable;
