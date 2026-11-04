import { useState, useEffect, useContext } from "react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import CharAvatar from "../Cards/CharAvatar";
import ThemeToggle from "../ui/ThemeToggle";
import { UserContext } from "../../context/UserContextDefinition";

const Navbar = ({ activeMenu }) => {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // while the mobile drawer is open: no background scroll, and Escape closes it
  useEffect(() => {
    if (!openSideMenu) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenSideMenu(false);
    };
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openSideMenu]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between py-3 px-4 md:px-6 fixed top-0 left-0 w-full z-50">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="icon-btn lg:hidden !text-gray-600 dark:!text-gray-300"
          onClick={() => setOpenSideMenu((open) => !open)}
          aria-label={openSideMenu ? "Close menu" : "Open menu"}
          aria-expanded={openSideMenu}
        >
          {openSideMenu ? <HiOutlineX className="text-2xl" /> : <HiOutlineMenu className="text-2xl" />}
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer"
          aria-label="Go to dashboard"
        >
          <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            <span className="text-purple-600 dark:text-purple-400">Money</span>
            Mint
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user && (
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2.5 pl-1 pr-1 sm:pr-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
            aria-label="Open settings"
          >
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <CharAvatar fullName={user.fullName || "User"} width="w-8" height="h-8" style="text-xs" />
            )}
            <span className="hidden sm:block text-sm font-semibold text-gray-800 dark:text-gray-100 max-w-[120px] truncate">
              {user.fullName?.split(" ")[0]}
            </span>
          </button>
        )}
      </div>

      {openSideMenu && (
        <>
          <div className="fixed inset-0 top-[61px] bg-black/40 z-40 lg:hidden animate-fade-in" onClick={() => setOpenSideMenu(false)} />
          <div className="fixed top-[61px] left-0 w-64 h-[calc(100dvh-61px)] bg-white dark:bg-gray-800 shadow-2xl z-50 lg:hidden animate-slide-right">
            <SideMenu activeMenu={activeMenu} onClose={() => setOpenSideMenu(false)} />
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
