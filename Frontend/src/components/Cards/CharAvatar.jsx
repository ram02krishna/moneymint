const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const CharAvatar = ({ fullName, width = "w-12", height = "h-12", style = "" }) => (
  <div
    className={`${width} ${height} ${style} flex items-center justify-center rounded-full font-semibold shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`}
    aria-hidden="true"
  >
    {getInitials(fullName)}
  </div>
);

export default CharAvatar;
