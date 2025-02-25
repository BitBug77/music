"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation"; // Correct import for App Router

const ScrollPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        router.push("/discover"); // Navigate to another page
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [router]);

  return null; // No UI needed
};

export default ScrollPage;
