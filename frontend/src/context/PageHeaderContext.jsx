import { createContext, useContext, useState, useCallback } from "react";

const PageHeaderContext = createContext(null);

export function PageHeaderProvider({ children }) {
  const [headerLabel, setHeaderLabel] = useState(null);

  const setPageHeaderLabel = useCallback((label) => {
    setHeaderLabel(label);
  }, []);

  const clearPageHeaderLabel = useCallback(() => {
    setHeaderLabel(null);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ headerLabel, setPageHeaderLabel, clearPageHeaderLabel }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeader must be used within a PageHeaderProvider");
  return ctx;
}