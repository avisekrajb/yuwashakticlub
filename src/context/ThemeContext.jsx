import { createContext, useContext, useEffect } from "react";
import useLS from "../hooks/useLS";

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useLS("syc_dark", false);
  const [notif, setNotif] = useLS("syc_notif", true);
  useEffect(() => { document.body.style.background = dark ? "#0b1020" : ""; return () => { document.body.style.background = ""; }; }, [dark]);
  return <Ctx.Provider value={{ dark, setDark, notif, setNotif }}>{children}</Ctx.Provider>;
}
