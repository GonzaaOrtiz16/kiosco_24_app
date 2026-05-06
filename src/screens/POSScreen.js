import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, Alert, 
  SafeAreaView, StatusBar, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// Iconos modernos
import { 
  ShoppingCart, Settings, LogOut, PackageSearch, 
  CheckCircle2, Trash2, UserPlus, X 
} from 'lucide-react-native';

// Importación de Componentes Modulares
import ScannerInput from '../components/ScannerInput';
import CartItem from '../components/CartItem';
import AuthModal from '../components/AuthModal';
import HistorySection from '../components/HistorySection';
import ScannerHibrido from '../components/ScannerHibrido'; // <--- NUEVO COMPONENTE HÍBRIDO

// Libs y Pantallas
import { getProducts, updateStock, insertMovements, getMovementsToday } from '../lib/supabase';
import AdminScreen from './AdminScreen'; 

const fmt = (n) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
}).format(n);

export default function POSScreen({ user, onLogout }) {
  // --- 1. HOOKS ---
  const isFocused = useIsFocused();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [movements, setMovements] = useState([]);
  const [view, setView] = useState('pos');
  
  const [pinVisible, setPinVisible] = useState(false);
  const [tempVoidData, setTempVoidData] = useState(null);
  
  const scannerInputRef = useRef(null);

  useEffect(() => { 
    loadInitialData(); 
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dbProducts, dbMovements] = await Promise.all([
        getProducts(),
        getMovementsToday()
      ]);
      setProducts(dbProducts || []);
      setMovements(dbMovements || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return products.filter(p => 
      (p.name || p.title)?.toLowerCase().includes(q) || 
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [search, products]);

  const historyGroups = useMemo(() => {
    const g = {};
    movements.filter(m => m.movement_type === 'venta' && m.seller_name === user?.full_name)
      .forEach(m => { 
        if (!g[m.sale_group]) g[m.sale_group] = []; 
        g[m.sale_group].push(m); 
      });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [movements, user]);

  const total = useMemo(() => cart.reduce((s, c) => s + c.price * c.qty, 0), [cart]);

  // --- 2. LÓGICA ---
  const addToCart = (p) => {
    if (p.stock <= 0) { 
      Alert.alert('Sin stock', `${p.name || p.title} no tiene unidades`); 
      setSearch('');
      return; 
    }
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id);
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
    setSearch('');
    if (!scanning) setTimeout(() => scannerInputRef.current?.focus(), 100);
  };

  const confirmSale = async () => {
    if (!cart.length) return;
    const ts = new Date().toISOString();
    const totalVenta = total;
    const newMovs = cart.map(c => ({
      product_id: c.id, 
      product_title: c.name || c.title,
      movement_type: 'venta',
      quantity: -c.qty, 
      price: c.price, 
      seller_name: user?.full_name || 'Vendedor', 
      sale_group: ts,
    }));

    try {
      setLoading(true);
      await insertMovements(newMovs);
      for (const item of cart) { 
        await updateStock(item.id, Math.max(0, item.stock - item.qty)); 
      }
      await loadInitialData();
      setCart([]);
      Alert.alert('✓ Venta confirmada', fmt(totalVenta));
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  const doVoid = async (sg, items) => {
    try {
      setLoading(true);
      const voids = items.map(m => ({ 
        product_id: m.product_id, 
        product_title: m.product_title, 
        movement_type: 'anulacion', 
        quantity: Math.abs(m.quantity), 
        price: m.price, 
        seller_name: user?.full_name, 
        sale_group: sg 
      }));
      await insertMovements(voids);
      for (const item of items) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) await updateStock(item.product_id, prod.stock + Math.abs(item.quantity));
      }
      await loadInitialData();
      Alert.alert('Éxito', 'Venta anulada correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo anular la venta');
    } finally {
      setLoading(false);
      setPinVisible(false);
    }
  };

  // --- 3. RENDERIZADO CONDICIONAL ---

  if (view === 'admin') {
    return <AdminScreen user={user} onBack={() => { setView('pos'); loadInitialData(); }} />;
  }

  // MODO ESCÁNER (HÍBRIDO)
  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScannerHibrido 
          onScan={(code) => {
            const found = products.find(p => p.barcode === code.trim());
            if (found) {
              addToCart(found);
              setScanning(false);
            } else {
              Alert.alert('No encontrado', `El código ${code} no existe en la base de datos.`, [
                { text: 'Reintentar' },
                { text: 'Cerrar', onPress: () => setScanning(false) }
              ]);
            }
          }} 
        />
        {/* Botón flotante para cerrar el escáner */}
        <TouchableOpacity 
          onPress={() => setScanning(false)} 
          style={s.closeScannerBtn}
        >
          <X color="white" size={24} />
          <Text style={{color: 'white', fontWeight: '900', marginLeft: 5}}>SALIR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onLogout} style={s.iconBtn}>
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
        
        <View style={s.titleContainer}>
            <Text style={s.headerTitle}>KIOSCO <Text style={s.blue}>24HS</Text></Text>
        </View>

        <TouchableOpacity onPress={() => setView('admin')} style={s.iconBtn}>
          <Settings color="#38bdf8" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.userRow}>
            <View style={s.activeDot} />
            <Text style={s.userBadge}>{user?.full_name} • {user?.role?.toUpperCase()}</Text>
        </View>

        <ScannerInput 
          ref={scannerInputRef}
          value={search}
          onChangeText={(text) => {
              setSearch(text);
              const found = products.find(p => p.barcode === text.trim());
              if (found) { addToCart(found); setSearch(''); }
          }}
          onCameraPress={() => setScanning(true)}
          isFocusedMode={isFocused && !pinVisible && !scanning}
        />

        {/* RESULTADOS DE BÚSQUEDA */}
        {results.map(p => (
          <TouchableOpacity key={p.id} style={s.result} onPress={() => addToCart(p)}>
            <PackageSearch color="#3f3f46" size={20} style={{marginRight: 10}} />
            <View style={{ flex: 1 }}>
              <Text style={s.resultTitle}>{p.name || p.title}</Text>
              <Text style={s.resultSub}>Stock: {p.stock} | {p.barcode}</Text>
            </View>
            <Text style={s.resultPrice}>{fmt(p.price)}</Text>
          </TouchableOpacity>
        ))}

        {/* CARRITO VISUAL */}
        {cart.length === 0 ? (
          <View style={s.emptyCart}>
            <ShoppingCart color="#18181b" size={80} strokeWidth={1.5} />
            <Text style={s.emptyText}>CARRITO VACÍO</Text>
            <Text style={s.emptySubText}>Escanea o busca productos para vender</Text>
            
            {user?.role === 'encargado' && (
              <TouchableOpacity style={s.quickAdmin} onPress={() => setView('admin')}>
                <UserPlus color="#38bdf8" size={16} />
                <Text style={s.quickAdminText}>Gestionar Usuarios y Stock</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.card}>
            <View style={s.cardHeader}>
                <ShoppingCart color="#71717a" size={14} />
                <Text style={s.cardTitle}>DETALLE DE VENTA</Text>
            </View>
            
            {cart.map(item => (
              <CartItem 
                key={item.id} 
                item={item} 
                onUpdateQty={(id, d) => setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + d) } : c))} 
                onRemove={(id) => setCart(prev => prev.filter(c => c.id !== id))} 
              />
            ))}
            
            <View style={s.totalRow}>
              <View>
                  <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
                  <Text style={s.totalAmt}>{fmt(total)}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.confirmBtn} onPress={confirmSale} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={s.btnContent}>
                    <CheckCircle2 color="#fff" size={22} />
                    <Text style={s.confirmBtnText}>CONFIRMAR COBRO</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <HistorySection 
          groups={historyGroups} 
          isVoided={(sg) => movements.some(m => m.movement_type === 'anulacion' && m.sale_group === sg)} 
          onVoid={(sg, items) => {
            setTempVoidData({ sg, items });
            if (user?.role === 'encargado') {
                Alert.alert("Anular", "¿Confirmas la anulación?", [{text:"No"}, {text:"Sí, anular", onPress:() => doVoid(sg, items)}]);
            } else setPinVisible(true);
          }} 
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      <AuthModal 
        visible={pinVisible} 
        onClose={() => setPinVisible(false)} 
        onSuccess={() => doVoid(tempVoidData.sg, tempVoidData.items)} 
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  topBar: { height: 60, backgroundColor: '#09090b', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#f4f4f5', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  blue: { color: '#38bdf8' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 8 },
  userBadge: { color: '#71717a', fontSize: 10, fontWeight: '900' },
  result: { backgroundColor: '#18181b', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
  resultTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  resultSub: { color: '#52525b', fontSize: 11 },
  resultPrice: { color: '#38bdf8', fontWeight: '900', fontSize: 15 },
  emptyCart: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { color: '#27272a', fontSize: 20, fontWeight: '900', marginTop: 15 },
  emptySubText: { color: '#3f3f46', fontSize: 13, marginTop: 5 },
  quickAdmin: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 30, backgroundColor: '#18181b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' },
  quickAdminText: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: '#18181b', borderRadius: 28, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#27272a', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#27272a', marginTop: 15, paddingTop: 15, alignItems: 'center' },
  totalLabel: { color: '#71717a', fontWeight: '900', fontSize: 10, textAlign: 'center', marginBottom: 5 },
  totalAmt: { color: '#fff', fontWeight: '900', fontSize: 38 },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 20, padding: 18, alignItems: 'center', marginTop: 20 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  closeScannerBtn: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(239, 68, 68, 0.9)', 
    padding: 12, 
    borderRadius: 15 
  }
});