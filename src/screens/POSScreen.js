import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, Alert, Modal,
  SafeAreaView, StatusBar, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// Iconos modernos
import { 
  ShoppingCart, Settings, LogOut, PackageSearch, 
  CheckCircle2, Trash2, UserPlus, X, LockKeyhole, AlertCircle 
} from 'lucide-react-native';

// Importación de Componentes Modulares
import ScannerInput from '../components/ScannerInput';
import CartItem from '../components/CartItem';
import AuthModal from '../components/AuthModal';
import HistorySection from '../components/HistorySection';
import ScannerHibrido from '../components/ScannerHibrido';

// Libs y Pantallas
import { getProducts, updateStock, insertMovements, supabase } from '../lib/supabase';
import AdminScreen from './AdminScreen'; 

const fmt = (n) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
}).format(n);

// --- COMPONENTE INTERNO PARA ANULACIÓN ---
const VoidModal = ({ visible, onClose, data, user, onDone }) => {
  const [loading, setLoading] = useState(false);
  if (!data) return null;

  const confirmVoid = async () => {
    try {
      setLoading(true);
      const voids = data.items.map(m => ({ 
        product_id: m.product_id, 
        product_title: m.product_title, 
        movement_type: 'anulacion', 
        quantity: Math.abs(m.quantity), 
        price: m.price, 
        seller_name: user?.full_name, 
        sale_group: data.sg 
      }));

      await insertMovements(voids);

      for (const item of data.items) {
        const { data: dbProd } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (dbProd) {
          await updateStock(item.product_id, dbProd.stock + Math.abs(item.quantity));
        }
      }

      Alert.alert('Éxito', 'Venta anulada correctamente');
      onDone();
      onClose();
    } catch (e) {
      Alert.alert('Error', 'No se pudo anular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          <AlertCircle color="#ef4444" size={40} />
          <Text style={s.modalTitle}>¿Anular venta?</Text>
          <Text style={s.modalSub}>Se devolverá el stock a los productos.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: '#27272a' }]} onPress={onClose}>
              <Text style={s.mBtnText}>NO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: '#ef4444' }]} onPress={confirmVoid} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mBtnText}>SÍ, ANULAR</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function POSScreen({ user, onLogout }) {
  const isFocused = useIsFocused();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [movements, setMovements] = useState([]);
  const [view, setView] = useState('pos');
  
  const [pinVisible, setPinVisible] = useState(false);
  const [authType, setAuthType] = useState('void'); 
  const [tempVoidData, setTempVoidData] = useState(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  
  const scannerInputRef = useRef(null);

  // --- CARGA DE DATOS SIN FILTROS DE VENDEDOR ---
  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Buscamos el último cierre de caja general (para que ambos vean el mismo turno)
      const { data: lastClose } = await supabase.from('stock_movements')
        .select('created_at')
        .eq('movement_type', 'cierre_caja')
        .order('created_at', { ascending: false })
        .limit(1);

      const startTime = lastClose?.[0]?.created_at || new Date(new Date().setHours(0,0,0,0)).toISOString();
      
      const [dbProducts, { data: dbMovements }] = await Promise.all([
        getProducts(),
        supabase.from('stock_movements')
          .select('*')
          .gt('created_at', startTime)
          .order('created_at', { ascending: false })
      ]);
      setProducts(dbProducts || []);
      setMovements(dbMovements || []);
    } catch (error) {
      console.error("Error en carga:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- REALTIME: ESCUCHA TODO ---
  useEffect(() => {
    let channel;
    if (isFocused) {
      loadInitialData();

      channel = supabase
        .channel('pos-global-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stock_movements' },
          () => {
            loadInitialData(); // Si alguien vende o anula, se refresca para ambos
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isFocused]);

  const handleAuthSuccess = () => {
    if (authType === 'void' && tempVoidData) {
      setVoidModalOpen(true);
    } else if (authType === 'close_shift') {
      executeCloseShift();
    }
    setPinVisible(false);
  };

  const executeCloseShift = async () => {
    try {
      setLoading(true);
      await supabase.from('stock_movements').insert([{
        product_id: null, product_title: 'CIERRE DE CAJA', movement_type: 'cierre_caja', quantity: 0, price: 0, seller_name: user?.full_name, sale_group: new Date().toISOString()
      }]);
      Alert.alert('✓ Turno Finalizado', 'Historial reiniciado para todos.');
      setCart([]);
      loadInitialData(); 
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar.');
    } finally {
      setLoading(false);
    }
  };

  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return products.filter(p => (p.name || p.title)?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)).slice(0, 5);
  }, [search, products]);

  // --- HISTORIAL COMPLETO DEL TURNO ---
  const historyGroups = useMemo(() => {
    const g = {};
    movements.filter(m => m.movement_type === 'venta') // Quitamos filtro de seller_name
      .forEach(m => { 
        if (!g[m.sale_group]) g[m.sale_group] = { items: [], dbTime: m.created_at }; 
        g[m.sale_group].items.push(m); 
      });
    return Object.entries(g).sort(([,a],[,b]) => b.dbTime.localeCompare(a.dbTime));
  }, [movements]);

  const total = useMemo(() => cart.reduce((s, c) => s + c.price * c.qty, 0), [cart]);

  const addToCart = (p) => {
    if (p.stock <= 0) { Alert.alert('Sin stock', p.name || p.title); setSearch(''); return; }
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
    const newMovs = cart.map(c => ({
      product_id: c.id, product_title: c.name || c.title, movement_type: 'venta', quantity: -c.qty, price: c.price, seller_name: user?.full_name, sale_group: ts,
    }));
    try {
      setLoading(true);
      await insertMovements(newMovs);
      for (const item of cart) { 
        const { data: d } = await supabase.from('products').select('stock').eq('id', item.id).single();
        await updateStock(item.id, Math.max(0, (d?.stock || item.stock) - item.qty)); 
      }
      setCart([]);
      Alert.alert('✓ Venta confirmada', fmt(total));
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'admin') return <AdminScreen user={user} onBack={() => { setView('pos'); loadInitialData(); }} />;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.topBar}>
        <TouchableOpacity onPress={onLogout} style={s.iconBtn}><LogOut color="#ef4444" size={20} /></TouchableOpacity>
        <View style={s.titleContainer}><Text style={s.headerTitle}>HMS <Text style={s.blue}>KIOSCO 24HS</Text></Text></View>
        <TouchableOpacity onPress={() => { setAuthType('close_shift'); setPinVisible(true); }} style={[s.iconBtn, { marginRight: 8, borderColor: '#ef4444' }]}><LockKeyhole color="#ef4444" size={20} /></TouchableOpacity>
        <TouchableOpacity onPress={() => setView('admin')} style={s.iconBtn}><Settings color="#38bdf8" size={20} /></TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.userRow}>
            <View style={s.activeDot} /><Text style={s.userBadge}>{user?.full_name} • {user?.role?.toUpperCase()}</Text>
        </View>

        <ScannerInput 
          ref={scannerInputRef} 
          value={search} 
          onChangeText={(t) => { 
            setSearch(t); 
            const f = products.find(p => p.barcode === t.trim()); 
            if (f) { addToCart(f); setSearch(''); }
          }} 
          onCameraPress={() => setScanning(true)} 
          isFocusedMode={isFocused && !pinVisible && !scanning} 
        />

        {results.map(p => (
          <TouchableOpacity key={p.id} style={s.result} onPress={() => addToCart(p)}>
            <PackageSearch color="#3f3f46" size={20} style={{marginRight: 10}} />
            <View style={{ flex: 1 }}><Text style={s.resultTitle}>{p.name || p.title}</Text><Text style={s.resultSub}>Stock: {p.stock}</Text></View>
            <Text style={s.resultPrice}>{fmt(p.price)}</Text>
          </TouchableOpacity>
        ))}

        {cart.length === 0 ? (
          <View style={s.emptyCart}><ShoppingCart color="#18181b" size={80} /><Text style={s.emptyText}>CARRITO VACÍO</Text></View>
        ) : (
          <View style={s.card}>
            {cart.map(item => (
              <CartItem key={item.id} item={item} onUpdateQty={(id, d) => setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + d) } : c))} onRemove={(id) => setCart(prev => prev.filter(c => c.id !== id))} />
            ))}
            <View style={s.totalRow}><Text style={s.totalAmt}>{fmt(total)}</Text></View>
            <TouchableOpacity style={s.confirmBtn} onPress={confirmSale} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmBtnText}>CONFIRMAR COBRO</Text>}
            </TouchableOpacity>
          </View>
        )}

        <HistorySection 
          groups={historyGroups} 
          isVoided={(sg) => movements.some(m => m.movement_type === 'anulacion' && m.sale_group === sg)} 
          onVoid={(sg, items) => {
            setTempVoidData({ sg, items });
            const role = user?.role?.toLowerCase() || '';
            if (role === 'encargado' || role === 'admin') {
              setVoidModalOpen(true);
            } else {
              setAuthType('void');
              setPinVisible(true);
            }
          }} 
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      <VoidModal visible={voidModalOpen} onClose={() => setVoidModalOpen(false)} data={tempVoidData} user={user} onDone={loadInitialData} />
      <AuthModal visible={pinVisible} onClose={() => setPinVisible(false)} onSuccess={handleAuthSuccess} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  topBar: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#18181b' },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#f4f4f5', fontSize: 15, fontWeight: '900' },
  blue: { color: '#38bdf8' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 8 },
  userBadge: { color: '#71717a', fontSize: 10, fontWeight: '900' },
  result: { backgroundColor: '#18181b', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8 },
  resultTitle: { color: '#fff', fontWeight: '800' },
  resultSub: { color: '#52525b', fontSize: 11 },
  resultPrice: { color: '#38bdf8', fontWeight: '900' },
  emptyCart: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: '#27272a', fontSize: 20, fontWeight: '900' },
  card: { backgroundColor: '#18181b', borderRadius: 28, padding: 20, marginTop: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: '#27272a', marginTop: 15, paddingTop: 15, alignItems: 'center' },
  totalAmt: { color: '#fff', fontWeight: '900', fontSize: 38 },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 20, padding: 18, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#18181b', padding: 25, borderRadius: 24, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 10 },
  modalSub: { color: '#71717a', fontSize: 13, textAlign: 'center', marginTop: 5 },
  mBtn: { flex: 1, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 }
});

