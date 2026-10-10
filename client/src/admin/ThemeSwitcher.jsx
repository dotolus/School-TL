import { useTheme } from "../theme/ThemeProvider";

export function ThemeSwitcher() {
  const { themes, activeThemeId, setActive } = useTheme() || {};

  if (!themes || themes.length === 0) return null;

  return (
    <div className="theme-switcher">
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={theme.id === activeThemeId ? "active" : ""}
          onClick={() => setActive(theme.id)}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}
