import { useContext } from "react";
import { UserContext } from "../../context/UserContextDefinition";
import Navbar from "./Navbar";
import SideMenu from "./SideMenu";

// Frame for every signed-in page: top bar, side menu (desktop) and the animated content area.
const DashboardLayout = ({ children, activeMenu }) => {
  const { user } = useContext(UserContext);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden w-full max-w-[100vw] relative">
      <Navbar activeMenu={activeMenu} />
      {user && (
        <div className="flex">
          <div className="hidden lg:block">
            <SideMenu activeMenu={activeMenu} />
          </div>
          <main
            key={activeMenu}
            className="page-enter flex-1 min-w-0 w-full max-w-full pt-20 px-4 md:px-6 pb-8 min-h-screen box-border lg:ml-64"
          >
            {children}
          </main>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
