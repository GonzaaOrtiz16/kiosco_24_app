import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import POSScreen from './src/screens/POSScreen';
import StockScreen from './src/screens/StockScreen';
import CierreScreen from './src/screens/CierreScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [movements, setMovements] = useState([]);

  const handleLogout = () => setUser(null);

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { 
              backgroundColor: '#18181b', 
              borderTopColor: '#27272a', 
              height: 60,
              borderTopWidth: 1
            },
            tabBarActiveTintColor: '#38bdf8', 
            tabBarInactiveTintColor: '#52525b',
            tabBarLabelStyle: { fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
          }}
        >
          <Tab.Screen name="Ventas">
            {(props) => (
              <POSScreen 
                {...props}
                user={user} 
                onLogout={handleLogout} 
                movements={movements} 
                onSale={(m) => setMovements(p => [...p, ...m])} 
              />
            )}
          </Tab.Screen>

          {/* Cambiamos la forma de pasar StockScreen para que sea estable en Web */}
          <Tab.Screen name="Stock">
            {(props) => <StockScreen {...props} user={user} />}
          </Tab.Screen>

          <Tab.Screen name="Cierre">
            {(props) => <CierreScreen {...props} user={user} movements={movements} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}