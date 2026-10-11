import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { LightboxProvider } from "./viewer/LightboxProvider";
import { ViewerPage } from "./viewer/ViewerPage";
import { AdminPage } from "./admin/AdminPage";

export function App() {
  return (
    <ThemeProvider>
      <LightboxProvider>
        <Routes>
          <Route path="/" element={<ViewerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </LightboxProvider>
    </ThemeProvider>
  );
}
