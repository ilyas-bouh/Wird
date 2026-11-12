import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type PageViewHandle = { inject: (js: string) => void };
type Props = { html: string; onMessage: (msg: string) => void; style?: StyleProp<ViewStyle> };

/** Web: the same HTML strip in a same-origin iframe; messages arrive via window.postMessage. */
const PageView = forwardRef<PageViewHandle, Props>(function PageView({ html, onMessage }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useImperativeHandle(
    ref,
    () => ({
      inject: (js) => {
        try {
          (frame.current?.contentWindow as unknown as { eval: (s: string) => void })?.eval(js);
        } catch {
          /* page not ready */
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const onWindowMessage = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data && typeof e.data.wird === 'string') cb.current(e.data.wird);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, []);

  return createElement('iframe', {
    ref: frame,
    srcDoc: html,
    style: { flex: 1, width: '100%', height: '100%', border: 0, background: 'transparent' },
  });
});

export default PageView;
