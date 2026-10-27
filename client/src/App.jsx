import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AttachmentViewerProvider } from "./viewer/AttachmentViewerProvider";
import { ViewerPage } from "./viewer/ViewerPage";
import { AdminPage } from "./admin/AdminPage";

export function App() {
  return (
    <ThemeProvider>
      <AttachmentViewerProvider>
        <Routes>
          <Route path="/" element={<ViewerPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </AttachmentViewerProvider>
    </ThemeProvider>
  );
}
