import { useContext } from "react";
import { ConfirmContext } from "../context/ConfirmContextDefinition";

/**
 * Promise-based replacement for window.confirm:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete budget?", message: "…", confirmLabel: "Delete" }))) return;
 */
export const useConfirm = () => useContext(ConfirmContext);
