import { useEffect, useState } from "react";

export default function useDashboardTheme() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.dataset.dashboardTheme === "dark"
  );

  useEffect(() => {
    const syncTheme = (e) => {
      const next = e?.detail;
      if (next === "dark" || next === "light") {
        setDark(next === "dark");
        return;
      }
      setDark(
        typeof document !== "undefined" &&
        document.documentElement.dataset.dashboardTheme === "dark"
      );
    };

    syncTheme();
    window.addEventListener("dashboard-theme-change", syncTheme);
    return () => window.removeEventListener("dashboard-theme-change", syncTheme);
  }, []);

  return dark;
}
