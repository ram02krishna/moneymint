import React, { useState, useEffect } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { LuSun, LuMoon } from "react-icons/lu";
import SideMenu from "./SideMenu";
import { useTheme } from "../../hooks/useTheme";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
    <div className="bg-white dark:bg-gray-800 shadow-lg flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-3 px-6 fixed top-0 left-0 w-full z-50 transition-all duration-300">
      <div className="flex items-center gap-5">
        <button
          className="block lg:hidden text-gray-600 dark:text-gray-300 p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
          onClick={() => {
            setOpenSideMenu(!openSideMenu);
          }}
        >
          {openSideMenu ? (
            <HiOutlineX className="text-2xl" />
          ) : (
            <HiOutlineMenu className="text-2xl" />
          )}
        </button>
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

      {openSideMenu && (
        <>
          <div
            className="fixed inset-0 top-[61px] bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
            onClick={() => setOpenSideMenu(false)}
          />
          <div className="fixed top-[61px] left-0 w-64 h-[calc(100vh-61px)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
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
