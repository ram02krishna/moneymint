import React from "react";

const EmptyState = ({ icon, title, message, action }) => (
  <div className="card flex flex-col items-center text-center py-14 px-6">
    <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-3xl mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-sm">{message}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
