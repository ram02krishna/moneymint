import React from "react";
import { LuArrowRight } from "react-icons/lu";

const DashboardWidget = ({ title, children, onSeeMore, className = "" }) => {
  return (
    <div
      className={`card h-auto min-h-[450px] transition-all duration-300 ease-in-out flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h5>
        {onSeeMore && (
          <button className="card-btn" onClick={onSeeMore}>
            See All <LuArrowRight className="text-base" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
};

export default DashboardWidget;
