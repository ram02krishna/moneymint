import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SIDE_MENU_DATA } from "../../utils/data";
import { UserContext } from "../../context/UserContextDefinition";
import CharAvatar from "../Cards/CharAvatar";
import { version } from "../../../package.json";

const SideMenu = ({ activeMenu, onClose }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleClick = (path) => {
    if (path === "/logout") {
      // clearUser removes only the session; wiping all of localStorage would also forget the theme
      clearUser();
      navigate("/login");
      return;
    }

    onClose?.();
    navigate(path);
  };

  return (
    <nav
      aria-label="Main"
      className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col shadow-sm lg:fixed lg:top-[61px] lg:left-0 lg:h-[calc(100dvh-61px)] lg:z-40"
    >
      <div className="flex flex-col items-center justify-center gap-2.5 mt-6 mb-5">
        <div className="relative">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover shadow-md ring-4 ring-purple-100 dark:ring-purple-900/40"
            />
          ) : (
            <CharAvatar fullName={user?.fullName || "User"} width="w-16" height="h-16" style="text-xl" />
          )}
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full" />
        </div>

        <div className="text-center">
          <h2 className="text-gray-900 dark:text-white font-semibold text-base">{user?.fullName || "User"}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-0.5 max-w-[180px] truncate">{user?.email}</p>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {SIDE_MENU_DATA.map((item) => {
          const isLogout = item.path === "/logout";
          const isActive = activeMenu === item.label;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`w-full flex items-center gap-3 text-sm py-2.5 px-4 rounded-xl transition-colors duration-200 group cursor-pointer ${
                isLogout
                  ? "mt-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : isActive
                    ? "bg-linear-to-r from-purple-600 to-purple-500 text-white font-semibold shadow-md shadow-purple-500/25"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
              }`}
              onClick={() => handleClick(item.path)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`text-lg ${
                  isLogout ? "text-red-500" : isActive ? "text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-purple-500"
                }`}
              />
              <span>{item.label}</span>
              {item.isNew && !isActive && <span className="ml-auto badge badge-purple">New</span>}
            </button>
          );
        })}
      </div>

      <p className="p-4 text-center text-xs text-gray-300 dark:text-gray-600">v{version}</p>
    </nav>
  );
};

export default SideMenu;
