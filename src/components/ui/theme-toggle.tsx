import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-full justify-start gap-2 h-10 px-3"
      aria-label={theme === 'light' ? 'Zum Dark-Mode wechseln' : 'Zum Light-Mode wechseln'}
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-5 w-5" />
          <span className="text-sm">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-5 w-5" />
          <span className="text-sm">Light Mode</span>
        </>
      )}
    </Button>
  );
};
