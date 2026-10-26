import {
  LuLayoutDashboard,
  LuHandCoins,
  LuWalletMinimal,
  LuLogOut,
  LuSettings,
  LuArrowRightLeft,
  LuTrendingUp,
<<<<<<< HEAD
  LuPiggyBank,
  LuTarget,
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
} from "react-icons/lu";

export let SIDE_MENU_DATA = [
  {
    id: "01",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "02",
    label: "Income",
    icon: LuWalletMinimal,
    path: "/income",
  },
  {
    id: "03",
    label: "Expense",
    icon: LuHandCoins,
    path: "/expense",
  },
  {
    id: "04",
    label: "Transactions",
    icon: LuArrowRightLeft,
    path: "/recent-transactions",
  },
  {
    id: "05",
    label: "Monthly Analytics",
    icon: LuTrendingUp,
    path: "/monthly-analytics",
  },
  {
    id: "06",
<<<<<<< HEAD
    label: "Budgets",
    icon: LuPiggyBank,
    path: "/budgets",
    isNew: true,
  },
  {
    id: "07",
    label: "Goals",
    icon: LuTarget,
    path: "/goals",
    isNew: true,
  },
  {
    id: "08",
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
    label: "Settings",
    icon: LuSettings,
    path: "/settings",
  },
  {
<<<<<<< HEAD
    id: "09",
=======
    id: "07",
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
    label: "Logout",
    icon: LuLogOut,
    path: "/logout",
  },
];
