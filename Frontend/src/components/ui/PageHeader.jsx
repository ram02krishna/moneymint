import React from "react";

// Shared page heading with optional subtitle and right-side actions
const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          {subtitle}
        </p>
      )}
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </div>
);

export default PageHeader;
