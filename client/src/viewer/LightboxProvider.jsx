import { createContext, useCallback, useContext, useState } from "react";
import { Lightbox } from "./Lightbox";

const LightboxContext = createContext(null);

export function LightboxProvider({ children }) {
  const [url, setUrl] = useState(null);

  const open = useCallback((imageUrl) => setUrl(imageUrl), []);
  const close = useCallback(() => setUrl(null), []);

  return (
    <LightboxContext.Provider value={{ open, close }}>
      {children}
      {url && <Lightbox url={url} onClose={close} />}
    </LightboxContext.Provider>
  );
}

export function useLightbox() {
  return useContext(LightboxContext);
}
