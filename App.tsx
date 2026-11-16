import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GardenScreen from './src/screens/GardenScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import BlobTabBar from './src/components/BlobTabBar';
import { FocusProvider } from './src/context/FocusContext';
import { GardenProvider } from './src/context/GardenContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import MapleGift from './src/components/MapleGift';
import { useGarden } from './src/context/GardenContext';
import { swipeNavigateTo } from './src/lib/swipeNav';
import { refreshInstalled } from './src/lib/localResources';
import SetupScreen from './src/screens/SetupScreen';
import { PortionProvider } from './src/context/PortionContext';
import { FONT_FILES } from './src/theme/fonts';
import SwipeNav, { SwipeProvider } from './src/components/SwipeNav';
import { navigationRef } from './src/lib/swipeNav';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { I18nProvider } from './src/i18n/I18nContext';

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  if (!fontsLoaded && !fontError) return null; // brief blank while the Arabic font loads

  return (
    <ThemeProvider>
      <I18nProvider>
        <Shell />
      </I18nProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const { colors, dark } = useTheme();
  const navTheme = { ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: colors.paper, card: colors.paleGreen, text: colors.text } };
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <SafeAreaProvider>
      <FocusProvider>
        <PortionProvider>
          <GardenProvider>
          <OnboardingProvider>
          <SwipeProvider>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            <SwipeNav>
            <Main />
            </SwipeNav>
          </NavigationContainer>
          </SwipeProvider>
          </OnboardingProvider>
          </GardenProvider>
        </PortionProvider>
      </FocusProvider>
    </SafeAreaProvider>
  );
}

/** The tabs, plus the first-run setup screen. Waits until the tour progress is known so the right tab opens first. */
function Main() {
  const onb = useOnboarding();
  useEffect(() => { refreshInstalled(); }, []);
  const { unlockTree } = useGarden();
  // once the maple overlay has faded in, switch to the Garden underneath it (the Garden's first mount happens unseen)
  useEffect(() => {
    if (onb.step !== 'maple') return;
    const id = setTimeout(() => swipeNavigateTo('Garden'), 480);
    return () => clearTimeout(id);
  }, [onb.step]);
  const start = useRef<'Garden' | 'Reader' | null>(null);
  if (onb.ready && start.current === null) start.current = onb.step === 'read' || onb.step === 'ayah' ? 'Reader' : 'Garden';
  if (!start.current) return null;
  return (
    <>
      <Tab.Navigator initialRouteName={start.current} tabBar={(props) => <BlobTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Garden" component={GardenScreen} />
        <Tab.Screen name="Reader" component={ReaderScreen} />
        <Tab.Screen name="Tafsir" component={TafsirScreen} />
      </Tab.Navigator>
      <MapleGift visible={onb.step === 'maple'} onPlant={() => { unlockTree(); onb.next(); }} />
      <SetupScreen visible={onb.step === 'setup'} onDone={onb.next} />
    </>
  );
}
