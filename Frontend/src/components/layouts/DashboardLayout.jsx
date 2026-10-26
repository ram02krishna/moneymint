import React, { useContext } from "react";
import { UserContext } from "../../context/UserContextDefinition";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";

// Layout component for the dashboard pages
let DashboardLayout = ({ children, activeMenu }) => {
  // Get the user from the UserContext
  let { user } = useContext(UserContext);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-x-hidden w-full max-w-[100vw] relative">
      {/* Top navigation bar */}
      <Navbar activeMenu={activeMenu} />
      {/* Render the side menu and content only if the user is logged in */}
      {user && (
        <div className="flex">
          {/* Side menu for larger screens */}
          <div className="hidden lg:block">
            <SideMenu activeMenu={activeMenu} />
          </div>
          {/* Main content area */}
          <div
            key={activeMenu}
            className="page-enter flex-1 min-w-0 w-full max-w-full pt-20 px-4 md:px-6 pb-8 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-61px)] lg:ml-64 transition-colors duration-300"
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
