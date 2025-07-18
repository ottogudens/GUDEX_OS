
"use client";

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Corresponds to md breakpoint in Tailwind

/**
 * A custom hook to determine if the current viewport is a mobile device.
 * @returns {boolean} True if the screen width is less than the mobile breakpoint.
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on initial mount
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return isMobile;
}
