import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkScreen();

    // Listen for window resize
    window.addEventListener("resize", checkScreen);

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  return isMobile;
}