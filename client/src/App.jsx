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
          <Route path="/:school/:period/:class">
            <Route index element={<ViewerPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </AttachmentViewerProvider>
    </ThemeProvider>
  );
}
