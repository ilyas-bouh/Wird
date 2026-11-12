import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GardenScreen from './src/screens/GardenScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import BlobTabBar from './src/components/BlobTabBar';
import { FocusProvider } from './src/context/FocusContext';
import { GardenProvider } from './src/context/GardenContext';
import { PortionProvider } from './src/context/PortionContext';
import { FONT_FILES } from './src/theme/fonts';
import SwipeNav, { SwipeProvider } from './src/components/SwipeNav';
import { navigationRef } from './src/lib/swipeNav';

const Tab = createBottomTabNavigator();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  if (!fontsLoaded && !fontError) return null; // brief blank while the Arabic font loads

  return (
    <SafeAreaProvider>
      <FocusProvider>
        <PortionProvider>
          <GardenProvider>
          <SwipeProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <SwipeNav>
            <Tab.Navigator tabBar={(props) => <BlobTabBar {...props} />} screenOptions={{ headerShown: false }}>
              <Tab.Screen name="Garden" component={GardenScreen} options={{ title: 'الحديقة' }} />
              <Tab.Screen name="Reader" component={ReaderScreen} options={{ title: 'المصحف' }} />
              <Tab.Screen name="Tafsir" component={TafsirScreen} options={{ title: 'التفسير' }} />
            </Tab.Navigator>
            </SwipeNav>
          </NavigationContainer>
          </SwipeProvider>
          </GardenProvider>
        </PortionProvider>
      </FocusProvider>
    </SafeAreaProvider>
  );
}
