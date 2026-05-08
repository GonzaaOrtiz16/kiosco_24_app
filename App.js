import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StatusBar } from 'react-native';
import { ShoppingCart, Package, CheckCircle2 } from 'lucide-react-native'; // Importamos los íconos
import LoginScreen from './src/screens/LoginScreen';
import POSScreen from './src/screens/POSScreen';
import StockScreen from './src/screens/StockScreen';
import CierreScreen from './src/screens/CierreScreen';

const Tab = createBottomTabNavigator();
const PRIMARY_COLOR = '#0ea5e9'; // Tu celeste azulado

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
          screenOptions={({ route }) => ({
            headerShown: false,
            // Lógica para mostrar los íconos dinámicamente
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Ventas') {
                return <ShoppingCart color={color} size={20} />;
              } else if (route.name === 'Stock') {
                return <Package color={color} size={20} />;
              } else if (route.name === 'Cierre') {
                return <CheckCircle2 color={color} size={20} />;
              }
            },
            tabBarStyle: { 
              backgroundColor: '#18181b', 
              borderTopColor: '#27272a', 
              height: 65,
              borderTopWidth: 1,
              paddingBottom: 10,
              paddingTop: 5
            },
            tabBarActiveTintColor: PRIMARY_COLOR, 
            tabBarInactiveTintColor: '#52525b',
            tabBarLabelStyle: { 
              fontWeight: '900', 
              fontSize: 10, 
              textTransform: 'uppercase',
              letterSpacing: 0.5
            },
          })}
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
