import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ViewerPage } from "./viewer/ViewerPage";
import { AdminPage } from "./admin/AdminPage";

export function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </ThemeProvider>
  );
}
