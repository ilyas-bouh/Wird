import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

export type PageViewHandle = { inject: (js: string) => void };
type Props = { html: string; onMessage: (msg: string) => void; style?: StyleProp<ViewStyle> };

/** Native: the mushaf strip lives in a WebView. (PageView.web.tsx is the iframe version.) */
const PageView = forwardRef<PageViewHandle, Props>(function PageView({ html, onMessage, style }, ref) {
  const web = useRef<React.ComponentRef<typeof WebView>>(null);
  useImperativeHandle(ref, () => ({ inject: (js) => web.current?.injectJavaScript(js) }), []);
  return (
    <WebView
      ref={web}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={(e) => onMessage(e.nativeEvent.data)}
      style={style}
      showsVerticalScrollIndicator={false}
    />
  );
});

export default PageView;
