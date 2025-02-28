"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation"; 

const ScrollPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        router.push("/discover"); 
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [router]);

  return null; 
};

export default ScrollPage;
