import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import GardenScreen from './src/screens/GardenScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.paleGreen },
        }}
      >
        <Tab.Screen name="Garden" component={GardenScreen} options={{ title: 'الحديقة' }} />
        <Tab.Screen name="Reader" component={ReaderScreen} options={{ title: 'المصحف' }} />
        <Tab.Screen name="Tafsir" component={TafsirScreen} options={{ title: 'التفسير' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
