import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AttachmentViewerProvider } from "./viewer/AttachmentViewerProvider";
import { ViewerPage } from "./viewer/ViewerPage";
import { AdminPage } from "./admin/AdminPage";
import { NotFoundPage } from "./NotFoundPage";
import { DatasetGate } from "./DatasetGate";

export function App() {
  return (
    <ThemeProvider>
      <AttachmentViewerProvider>
        <Routes>
          <Route path="/:school/:period/:class" element={<DatasetGate />}>
            <Route index element={<ViewerPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="/:school/:period" element={<NotFoundPage />} />
          <Route path="/:school" element={<NotFoundPage />} />
          <Route path="/" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AttachmentViewerProvider>
    </ThemeProvider>
  );
}
