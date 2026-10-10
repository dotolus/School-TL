import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const ThemeContext = createContext(null);

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars || {}).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

export function ThemeProvider({ children }) {
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState(null);

  const refresh = useCallback(async () => {
    const data = await api.getThemes();
    setThemes(data.themes);
    setActiveThemeId(data.activeThemeId);
    const active = data.themes.find((t) => t.id === data.activeThemeId);
    if (active) applyVars(active.vars);
  }, []);

  useEffect(() => {
    refresh().catch((err) => console.error("Failed to load themes", err));
  }, [refresh]);

  const setActive = useCallback(
    async (id) => {
      const data = await api.setActiveTheme(id);
      setActiveThemeId(data.activeThemeId);
      const active = data.themes.find((t) => t.id === data.activeThemeId);
      if (active) applyVars(active.vars);
    },
    []
  );

  return (
    <ThemeContext.Provider value={{ themes, activeThemeId, setActive }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
