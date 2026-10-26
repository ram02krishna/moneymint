import { useContext } from "react";
import { ToastContext } from "../context/ToastContextDefinition";

export const useToast = () => useContext(ToastContext).toast;
