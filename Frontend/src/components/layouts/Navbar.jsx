<<<<<<< HEAD
import React, { useState, useEffect, useContext } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuSun, LuMoon } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import CharAvatar from "../Cards/CharAvatar";
import { useTheme } from "../../hooks/useTheme";
import { UserContext } from "../../context/UserContextDefinition";
=======
import React, { useState, useEffect } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuSun, LuMoon } from "react-icons/lu";
import SideMenu from "./SideMenu";
import { useTheme } from "../../hooks/useTheme";
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
<<<<<<< HEAD
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

  // Prevent background scroll when SideMenu is open
  useEffect(() => {
    if (openSideMenu) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [openSideMenu]);

  return (
<<<<<<< HEAD
    <div className="glass-bar flex items-center justify-between py-3 px-4 md:px-6 fixed top-0 left-0 w-full z-50 transition-all duration-300">
      <div className="flex items-center gap-3">
        <button
          className="block lg:hidden text-gray-600 dark:text-gray-300 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
          onClick={() => setOpenSideMenu(!openSideMenu)}
          aria-label="Toggle menu"
=======
    <div className="bg-white dark:bg-gray-800 shadow-lg flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-3 px-6 fixed top-0 left-0 w-full z-50 transition-all duration-300">
      <div className="flex items-center gap-5">
        <button
          className="block lg:hidden text-gray-600 dark:text-gray-300 p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
          onClick={() => {
            setOpenSideMenu(!openSideMenu);
          }}
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
        >
          {openSideMenu ? (
            <HiOutlineX className="text-2xl" />
          ) : (
            <HiOutlineMenu className="text-2xl" />
          )}
        </button>
<<<<<<< HEAD
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer"
          aria-label="Go to dashboard"
        >
          <span className="brand-mark">M</span>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            <span className="text-purple-600 dark:text-purple-400">Money</span>
            Mint
          </h2>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105 transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <LuSun className="text-lg text-yellow-400" />
          ) : (
            <LuMoon className="text-lg text-purple-600" />
          )}
        </button>

        {user && (
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2.5 pl-1 pr-1 sm:pr-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
            aria-label="Open settings"
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <CharAvatar
                fullName={user.fullName || "User"}
                width="w-8"
                height="h-8"
                style="text-xs font-semibold"
              />
            )}
            <span className="hidden sm:block text-sm font-semibold text-gray-800 dark:text-gray-100 max-w-[120px] truncate">
              {user.fullName?.split(" ")[0]}
            </span>
          </button>
        )}
      </div>
=======
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="text-purple-600 dark:text-purple-500">Money</span>Mint
        </h2>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
        aria-label="Toggle Theme"
      >
        {theme === "dark" ? (
          <LuSun className="text-xl text-yellow-500" />
        ) : (
          <LuMoon className="text-xl text-purple-600" />
        )}
      </button>
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

      {openSideMenu && (
        <>
          <div
            className="fixed inset-0 top-[61px] bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
            onClick={() => setOpenSideMenu(false)}
          />
<<<<<<< HEAD
          <div className="fixed top-[61px] left-0 w-64 h-[calc(100vh-61px)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden animate-slide-right">
=======
          <div className="fixed top-[61px] left-0 w-64 h-[calc(100vh-61px)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
            <SideMenu
              activeMenu={activeMenu}
              onClose={() => setOpenSideMenu(false)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Navbar;
