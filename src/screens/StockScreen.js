import { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  StyleSheet, SafeAreaView, ActivityIndicator, 
  KeyboardAvoidingView, Platform, Modal
} from 'react-native';
// 1. IMPORTAMOS EL HÍBRIDO Y QUITAMOS EXPO-CAMERA
import { ScanBarcode, X } from 'lucide-react-native'; 
import ScannerHibrido from '../components/ScannerHibrido'; 
import { getProducts, insertProduct, updateStock } from '../lib/supabase';

export default function StockScreen({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState(0);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProd, setNewProd] = useState({ barcode: '', name: '', price: '', stock: '' });

  // Estado para el escáner
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (e) {
      console.error("Error al cargar:", e);
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNCIÓN SIMPLIFICADA (El componente hibrido ya maneja permisos internamente)
  const openScanner = () => {
    setIsScannerVisible(true);
  };

  const handleBarCodeScanned = (data) => {
    setNewProd(prev => ({ ...prev, barcode: data }));
    setIsScannerVisible(false);
    // Un pequeño delay para que no se pise con el cierre del modal
    setTimeout(() => alert(`Código detectado: ${data}`), 500);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => 
      (p.name || "").toLowerCase().includes(q) || (p.barcode || "").includes(q)
    );
  }, [products, search]);

  const handleCreateProduct = async () => {
    if (!newProd.barcode || !newProd.name || !newProd.price) {
      alert('Faltan datos obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      await insertProduct({
        barcode: String(newProd.barcode).trim(),
        name: newProd.name.toUpperCase().trim(),
        price: parseFloat(newProd.price),
        stock: parseInt(newProd.stock) || 0,
        category: 'Varios'
      });
      
      alert('✓ Producto registrado');
      setNewProd({ barcode: '', name: '', price: '', stock: '' });
      setShowAddForm(false);
      await fetchInitialData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAdjustment = async () => {
    if (!selected) return;
    const newQty = Math.max(0, (selected.stock || 0) + delta);
    try {
      setLoading(true);
      await updateStock(selected.id, newQty);
      await fetchInitialData();
      setSelected(null);
      setDelta(0);
      alert('✓ Stock actualizado');
    } catch (e) {
      alert('Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={s.headerContainer}>
            <Text style={s.headerTitle}>Panel de <Text style={s.blue}>Stock</Text></Text>
            {user?.role === 'encargado' && (
              <TouchableOpacity 
               style={[s.addBtn, showAddForm && s.addBtnActive]} 
               onPress={() => {
                   setShowAddForm(!showAddForm);
                   if(!showAddForm) setSelected(null);
               }}
              >
                <Text style={s.addBtnText}>{showAddForm ? 'CANCELAR' : '+ NUEVO'}</Text>
              </TouchableOpacity>
            )}
        </View>

        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
          {showAddForm && (
            <View style={s.addCard}>
              <Text style={s.cardLabel}>CÓDIGO DE BARRAS</Text>
              <View style={s.inputWithBtn}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Escanee o escriba..."
                  placeholderTextColor="#71717a"
                  value={newProd.barcode}
                  onChangeText={t => setNewProd(prev => ({...prev, barcode: t}))}
                />
                <TouchableOpacity style={s.miniScanBtn} onPress={openScanner}>
                  <ScanBarcode color="#fff" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={s.cardLabel}>NOMBRE DEL PRODUCTO</Text>
              <TextInput
                style={s.input}
                placeholder="Ej: Coca Cola 500ml"
                placeholderTextColor="#71717a"
                value={newProd.name}
                onChangeText={t => setNewProd(prev => ({...prev, name: t}))}
              />
              <View style={{flexDirection:'row', gap:10}}>
                  <View style={{flex:1}}>
                    <Text style={s.cardLabel}>PRECIO</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#71717a"
                        value={newProd.price}
                        onChangeText={t => setNewProd(prev => ({...prev, price: t}))}
                    />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.cardLabel}>STOCK INICIAL</Text>
                    <TextInput
                        style={s.input}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#71717a"
                        value={newProd.stock}
                        onChangeText={t => setNewProd(prev => ({...prev, stock: t}))}
                    />
                  </View>
              </View>
              <TouchableOpacity 
                  style={[s.saveBtn, loading && {opacity: 0.5}]} 
                  onPress={handleCreateProduct}
                  disabled={loading}
              >
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>GUARDAR PRODUCTO</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={s.searchContainer}>
            <TextInput 
              style={s.input} 
              placeholder="🔍 Buscar por nombre o código..." 
              placeholderTextColor="#71717a"
              value={search} 
              onChangeText={setSearch} 
            />
          </View>

          <View style={s.listCard}>
            {filtered.map(p => (
              <TouchableOpacity key={p.id} style={[s.row, selected?.id === p.id && s.rowSelected]}
                onPress={() => { setSelected(p); setDelta(0); setShowAddForm(false); }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.brand}>{p.barcode}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={[s.stock, p.stock <= 3 ? s.red : s.green]}>{p.stock} Uds.</Text>
                  <Text style={{color: '#71717a', fontSize: 10}}>${p.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {selected && (
            <View style={s.adjCard}>
              <Text style={s.adjTitle}>AJUSTAR STOCK: {selected.name}</Text>
              <View style={s.adjRow}>
                <TouchableOpacity style={s.adjBtn} onPress={() => setDelta(d => d - 1)}><Text style={s.adjBtnText}>−</Text></TouchableOpacity>
                <View style={s.adjCenter}>
                  <Text style={s.adjVal}>{(selected.stock || 0) + delta}</Text>
                  <Text style={s.adjSub}>{delta > 0 ? `+${delta}` : delta} unidades</Text>
                </View>
                <TouchableOpacity style={[s.adjBtn, s.adjBtnBlue]} onPress={() => setDelta(d => d + 1)}><Text style={s.adjBtnText}>+</Text></TouchableOpacity>
              </View>
              <TouchableOpacity 
                  style={[s.saveBtn, loading && {opacity: 0.5}]} 
                  onPress={saveAdjustment}
                  disabled={loading}
              >
                <Text style={s.saveBtnText}>CONFIRMAR NUEVO STOCK</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 3. MODAL ACTUALIZADO CON EL ESCÁNER HÍBRIDO */}
        <Modal visible={isScannerVisible} animationType="slide">
          <View style={s.modalScanner}>
            <ScannerHibrido onScan={handleBarCodeScanned} />
            
            <View style={s.cameraOverlay}>
              <TouchableOpacity style={s.closeCam} onPress={() => setIsScannerVisible(false)}>
                <X color="#fff" size={30} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  blue: { color: '#38bdf8' },
  addBtn: { backgroundColor: '#38bdf820', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38bdf8' },
  addBtnActive: { borderColor: '#ef4444', backgroundColor: '#ef444410' },
  addBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  scroll: { flex: 1 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 10 },
  input: { backgroundColor: '#18181b', color: '#fff', borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#27272a', marginBottom: 10 },
  inputWithBtn: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  miniScanBtn: { backgroundColor: '#38bdf8', borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 5, marginLeft: 5 },
  addCard: { backgroundColor: '#18181b', borderRadius: 20, padding: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#38bdf840' },
  saveBtn: { backgroundColor: '#38bdf8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  listCard: { backgroundColor: '#18181b', borderRadius: 20, overflow: 'hidden', marginHorizontal: 16 },
  row: { flexDirection: 'row', padding: 18, borderBottomWidth: 1, borderBottomColor: '#27272a', alignItems: 'center' },
  rowSelected: { backgroundColor: '#38bdf810' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  brand: { color: '#71717a', fontSize: 12 },
  stock: { fontWeight: '900', fontSize: 16 },
  green: { color: '#22c55e' }, red: { color: '#ef4444' },
  adjCard: { backgroundColor: '#18181b', borderRadius: 20, padding: 25, marginTop: 20, marginHorizontal: 16, borderTopWidth: 2, borderTopColor: '#38bdf8' },
  adjTitle: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 20 },
  adjRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30, marginBottom: 25 },
  adjBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  adjBtnBlue: { backgroundColor: '#38bdf8' },
  adjBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  adjCenter: { alignItems: 'center' },
  adjVal: { color: '#fff', fontSize: 40, fontWeight: '900' },
  adjSub: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  modalScanner: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  closeCam: { position: 'absolute', bottom: 50, backgroundColor: '#ef4444', padding: 15, borderRadius: 50 }
});