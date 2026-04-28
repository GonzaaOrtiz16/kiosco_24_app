import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { SUPERVISOR_PIN } from '../data/mock';
import BarcodeScanner from '../components/BarcodeScanner';
import { getProducts, updateStock, insertMovements, getMovementsToday } from '../lib/supabase';
import AdminScreen from './AdminScreen'; 

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export default function POSScreen({ user }) {
  // --- 1. TODOS LOS HOOKS VAN AQUÍ ARRIBA (REGLA DE ORO DE REACT) ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [movements, setMovements] = useState([]);
  const [view, setView] = useState('pos');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Movemos los useMemo aquí arriba para que siempre se ejecuten
  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return products.filter(p => p.title?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)).slice(0, 5);
  }, [search, products]);

  const groups = useMemo(() => {
    const g = {};
    movements.filter(m => m.movement_type === 'venta').forEach(m => {
      if (!g[m.sale_group]) g[m.sale_group] = [];
      g[m.sale_group].push(m);
    });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [movements]);

  // --- 2. FUNCIONES DE LÓGICA ---
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dbProducts, dbMovements] = await Promise.all([
        getProducts(),
        getMovementsToday()
      ]);
      setProducts(dbProducts);
      setMovements(dbMovements);
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (p) => {
    if (p.stock <= 0) { Alert.alert('Sin stock', `${p.title} no tiene stock`); return; }
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id);
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...p, qty: 1 }];
    });
    setSearch('');
  };

  const updQty = (id, d) => setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + d) } : c));
  const remove = (id) => setCart(prev => prev.filter(c => c.id !== id));
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const confirmSale = async () => {
    if (!cart.length) return;
    const ts = new Date().toISOString();
    const newMovs = cart.map(c => ({
      product_id: c.id, product_title: c.title, movement_type: 'venta',
      quantity: -c.qty, price: c.price, seller_name: user?.full_name || 'Vendedor', sale_group: ts,
    }));

    try {
      setLoading(true);
      await insertMovements(newMovs);
      for (const item of cart) { await updateStock(item.id, Math.max(0, item.stock - item.qty)); }
      await loadInitialData();
      setCart([]);
      Alert.alert('✓ Venta confirmada', fmt(total));
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  const isVoided = (sg) => movements.some(m => m.movement_type === 'anulacion' && m.sale_group === sg);

  const initiateVoid = (sg, items) => {
    if (user?.role === 'encargado') doVoid(sg, items);
    else Alert.prompt('PIN Supervisor', 'Ingresá el PIN para anular',
      (pin) => { if (pin === SUPERVISOR_PIN) doVoid(sg, items); else Alert.alert('PIN incorrecto'); },
      'secure-text'
    );
  };

  const doVoid = async (sg, items) => {
    const voids = items.map(m => ({ 
      product_id: m.product_id, product_title: m.product_title, movement_type: 'anulacion', 
      quantity: Math.abs(m.quantity), price: m.price, seller_name: user?.full_name || 'Vendedor', sale_group: sg 
    }));
    try {
      setLoading(true);
      await insertMovements(voids);
      for (const item of items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) await updateStock(item.product_id, product.stock + Math.abs(item.quantity));
      }
      await loadInitialData();
    } catch (error) { Alert.alert('Error', 'No se pudo anular'); }
    finally { setLoading(false); }
  };

  // --- 3. CONDICIONES DE RENDERIZADO (AHORA SÍ, DESPUÉS DE LOS HOOKS) ---

  if (view === 'admin') {
    return <AdminScreen user={user} onBack={() => setView('pos')} />;
  }

  if (scanning) return <BarcodeScanner onScan={(code) => {
    setScanning(false);
    const found = products.find(p => p.barcode === code);
    if (found) addToCart(found);
    else Alert.alert('No encontrado', code);
  }} onClose={() => setScanning(false)} />;

  // --- 4. RENDER PRINCIPAL DEL POS ---
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      
      {loading && (
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      )}

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        
        <View style={s.header}>
          <Text style={s.userBadge}>{user?.full_name || 'Sesión Activa'}</Text>
          <TouchableOpacity onPress={() => setView('admin')}>
            <Text style={s.settingsBtn}>⚙️ AJUSTES</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={s.scanBtn} onPress={() => setScanning(true)}>
          <Text style={s.scanBtnText}>📷   ESCANEAR QR / CÓDIGO DE BARRAS</Text>
        </TouchableOpacity>

        <TextInput 
          style={s.input} 
          placeholder="Buscar producto..." 
          placeholderTextColor="#52525b"
          value={search} 
          onChangeText={setSearch} 
        />

        {results.map(p => (
          <TouchableOpacity key={p.id} style={s.result} onPress={() => addToCart(p)}>
            <View style={{ flex: 1 }}>
              <Text style={s.resultTitle}>{p.title}</Text>
              <Text style={s.resultSub}>Stock: {p.stock}</Text>
            </View>
            <Text style={s.resultPrice}>{fmt(p.price)}</Text>
          </TouchableOpacity>
        ))}

        {cart.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>VENTA ACTUAL</Text>
            {cart.map(item => (
              <View key={item.id} style={s.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartName}>{item.title}</Text>
                  <Text style={s.cartSub}>{fmt(item.price)} c/u</Text>
                </View>
                <TouchableOpacity style={s.qtyBtn} onPress={() => updQty(item.id, -1)}><Text style={s.qtyTxt}>−</Text></TouchableOpacity>
                <Text style={s.qty}>{item.qty}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => updQty(item.id, 1)}><Text style={s.qtyTxt}>+</Text></TouchableOpacity>
                <Text style={s.cartTotal}>{fmt(item.price * item.qty)}</Text>
                <TouchableOpacity onPress={() => remove(item.id)}><Text style={s.del}>✕</Text></TouchableOpacity>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalAmt}>{fmt(total)}</Text>
            </View>
            <TouchableOpacity style={s.confirmBtn} onPress={confirmSale} disabled={loading}>
              <Text style={s.confirmBtnText}>✓   CONFIRMAR VENTA</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardTitle}>HISTORIAL DEL TURNO</Text>
          {groups.length === 0 && !loading && <Text style={s.empty}>Sin ventas hoy</Text>}
          {groups.map(([sg, items]) => {
            const voided = isVoided(sg);
            const subtotal = items.reduce((s,m) => s + Math.abs(m.quantity) * m.price, 0);
            return (
              <View key={sg} style={[s.histRow, voided && s.voided]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.histTime}>{timeStr(sg)} · {items[0].seller_name}</Text>
                  {items.map(m => <Text key={m.id} style={s.histItem}>{m.product_title} x{Math.abs(m.quantity)}</Text>)}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.histAmt}>{fmt(subtotal)}</Text>
                  {voided ? <Text style={s.voidBadge}>ANULADA</Text> :
                    <TouchableOpacity onPress={() => initiateVoid(sg, items)}>
                      <Text style={s.voidBtn}>↩ Anular</Text>
                    </TouchableOpacity>}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(9, 9, 11, 0.7)', zIndex: 10 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 10 },
  userBadge: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 1, backgroundColor: '#18181b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  settingsBtn: { color: '#f97316', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  scanBtn: { backgroundColor: '#f97316', borderRadius: 20, padding: 18, alignItems: 'center', marginBottom: 16, marginTop: 10 },
  scanBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.2 },
  input: { backgroundColor: '#18181b', color: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, fontWeight: 'bold', marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
  result: { backgroundColor: '#18181b', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 4, borderWidth: 1, borderColor: '#27272a' },
  resultTitle: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  resultSub: { color: '#52525b', fontSize: 11 },
  resultPrice: { color: '#f97316', fontWeight: '900', fontSize: 14 },
  card: { backgroundColor: '#18181b', borderRadius: 24, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#27272a' },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  cartName: { color: '#fff', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  cartSub: { color: '#52525b', fontSize: 10 },
  qtyBtn: { backgroundColor: '#27272a', width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  qtyTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  qty: { color: '#fff', fontWeight: '900', fontSize: 14, width: 24, textAlign: 'center' },
  cartTotal: { color: '#fff', fontWeight: '900', fontSize: 13, width: 70, textAlign: 'right' },
  del: { color: '#ef4444', fontSize: 16, paddingLeft: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4 },
  totalLabel: { color: '#71717a', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  totalAmt: { color: '#fff', fontWeight: '900', fontSize: 30, fontStyle: 'italic' },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 18, padding: 18, alignItems: 'center', marginTop: 16 },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  histRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  voided: { opacity: 0.3 },
  histTime: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  histItem: { color: '#a1a1aa', fontSize: 11 },
  histAmt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  voidBtn: { color: '#ef4444', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  voidBadge: { color: '#ef4444', fontSize: 9, fontWeight: '900', backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  empty: { color: '#52525b', textAlign: 'center', fontSize: 12, paddingVertical: 20 },
});