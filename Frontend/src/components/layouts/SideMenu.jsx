import React, { useContext } from "react";
import { SIDE_MENU_DATA } from "../../utils/data";
import { UserContext } from "../../context/UserContextDefinition";
import { useNavigate } from "react-router-dom";
import CharAvatar from "../Cards/CharAvatar";

let SideMenu = ({ activeMenu, onClose }) => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  let handleClick = (path) => {
    if (path === "/logout") {
      handleLogout();
      return;
    }

    if (onClose) {
      onClose();
    }

    navigate(path);
  };

  let handleLogout = () => {
    localStorage.clear();
    clearUser();
    navigate("/login");
  };

  return (
    <div className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col shadow-sm transition-all duration-300 lg:fixed lg:top-[61px] lg:left-0 lg:h-[calc(100vh-61px)] lg:z-50">
      {/* Profile section */}
      <div className="flex flex-col items-center justify-center gap-2.5 mt-6 mb-5">
        <div className="relative">
          {!user?.profileImageUrl ? (
            <CharAvatar
              fullName={user?.fullName || "User"}
              width="w-16"
              height="h-16"
              style="text-xl font-semibold"
            />
          ) : (
            <img
              src={user?.profileImageUrl}
              alt="Profile Image"
              className="w-16 h-16 rounded-full object-cover shadow-md ring-4 ring-purple-100 dark:ring-purple-900/40"
            />
          )}
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
        </div>

        <div className="text-center">
          <h5 className="text-gray-900 dark:text-white font-semibold text-base">
            {user?.fullName || "User"}
          </h5>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-0.5 max-w-[180px] truncate">
            {user?.email || "Free Member"}
          </p>
        </div>
      </div>

      {/* Menu items */}
      <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {SIDE_MENU_DATA.map((item, index) => (
          <button
            key={`menu_${index}`}
            className={`relative w-full flex items-center gap-3 text-sm py-2.5 px-4 rounded-xl transition-all duration-200 group cursor-pointer ${
              item.path === "/logout"
                ? "mt-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                : activeMenu === item.label
                  ? "bg-linear-to-r from-purple-600 to-purple-500 text-white font-semibold shadow-md shadow-purple-500/25"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
            }`}
            onClick={() => handleClick(item.path)}
            aria-current={activeMenu === item.label ? "page" : undefined}
          >
            {item.icon && (
              <item.icon
                className={`text-lg ${
                  item.path === "/logout"
                    ? "text-red-500"
                    : activeMenu === item.label
                      ? "text-white"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-purple-500"
                }`}
              />
            )}
            <span>{item.label}</span>
            {item.isNew && activeMenu !== item.label && (
              <span className="ml-auto badge badge-purple">New</span>
            )}
          </button>
        ))}
      </div>

      {/* Footer/Logout Area could go here */}
      <div className="p-4 text-center">
        <p className="text-xs text-gray-300 dark:text-gray-600">v2.2.0</p>
      </div>
    </div>
  );
};

export default SideMenu;
