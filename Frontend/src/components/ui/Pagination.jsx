import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

// Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20
const pageItems = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...items].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ["gap", p] : [p]));
};

const Pagination = ({ page, totalPages, onChange, disabled = false }) => {
  if (totalPages <= 1) return null;

  const go = (next) => {
    if (!disabled && next >= 1 && next <= totalPages && next !== page) onChange(next);
  };

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-6" aria-label="Pagination">
      <button
        type="button"
        className="icon-btn disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => go(page - 1)}
        disabled={disabled || page === 1}
        aria-label="Previous page"
      >
        <LuChevronLeft />
      </button>

      {pageItems(page, totalPages).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-gray-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => go(item)}
            disabled={disabled}
            aria-current={item === page ? "page" : undefined}
            className={`min-w-9 h-9 px-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              item === page
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className="icon-btn disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => go(page + 1)}
        disabled={disabled || page === totalPages}
        aria-label="Next page"
      >
        <LuChevronRight />
      </button>
    </nav>
  );
};

export default Pagination;
