"use client";

import { useLayoutEffect, useState } from "react";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";

export const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useLayoutEffect(() => {
    const el = document.documentElement;
    const isDark = el.classList.contains("dark");
    setIsDarkMode(isDark);

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      el.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleDark = () => {
    const el = document.documentElement;
    el.classList.toggle("dark");
    const isDark = el.classList.contains("dark");
    setIsDarkMode(isDark);

    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[300]">
      <Button
        onClick={toggleDark}
        variant={"ghost"}
        className={"flex items-center gap-1.5"}
      >
        <span>
          {isDarkMode ? (
            <Sun className={"size-4"} />
          ) : (
            <Moon className={"size-4"} />
          )}
        </span>
        <span>{isDarkMode ? "Light" : "Dark"} Mode</span>
      </Button>
    </div>
  );
}; 