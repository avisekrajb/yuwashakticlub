import { useCallback, useRef, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const say = useCallback((text, chat) => {
    if (!text) return;
    setToast({ t: text, chat: Boolean(chat), id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), chat ? 4200 : 2400);
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, say, dismiss };
}
