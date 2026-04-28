import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import POSScreen from './src/screens/POSScreen';
import StockScreen from './src/screens/StockScreen';
import CierreScreen from './src/screens/CierreScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [movements, setMovements] = useState([]);

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#18181b', borderTopColor: '#27272a', paddingBottom: 8, height: 60 },
          tabBarActiveTintColor: '#f97316',
          tabBarInactiveTintColor: '#52525b',
          tabBarLabelStyle: { fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
        }}
      >
        <Tab.Screen name="POS" options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛒</Text> }}>
          {() => <POSScreen user={user} movements={movements} onSale={(m) => setMovements(p => [...p, ...m])} />}
        </Tab.Screen>
        <Tab.Screen name="Stock" options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text> }}>
          {() => <StockScreen />}
        </Tab.Screen>
        <Tab.Screen name="Cierre" options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text> }}>
          {() => <CierreScreen user={user} movements={movements} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}