import { createContext, useCallback, useContext, useState } from "react";
import { AttachmentViewer } from "./AttachmentViewer";

const AttachmentViewerContext = createContext(null);

export function AttachmentViewerProvider({ children }) {
  const [attachment, setAttachment] = useState(null);

  const open = useCallback((a) => setAttachment(a), []);
  const close = useCallback(() => setAttachment(null), []);

  return (
    <AttachmentViewerContext.Provider value={{ open, close }}>
      {children}
      {attachment && <AttachmentViewer {...attachment} onClose={close} />}
    </AttachmentViewerContext.Provider>
  );
}

export function useAttachmentViewer() {
  return useContext(AttachmentViewerContext);
}
