import { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  StyleSheet, SafeAreaView, ActivityIndicator, 
  KeyboardAvoidingView, Platform, Modal, Alert
} from 'react-native';
import { 
  ScanBarcode, X, Package, AlertTriangle, CheckCircle, Edit2, Save, Search 
} from 'lucide-react-native'; 
import ScannerHibrido from '../components/ScannerHibrido'; 
import { getProducts, insertProduct, updateStock, supabase } from '../lib/supabase';

export default function StockScreen({ user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Estados para Edición/Ajuste
  const [editandoId, setEditandoId] = useState(null);
  const [datosEditados, setDatosEditados] = useState({});
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProd, setNewProd] = useState({ barcode: '', name: '', price: '', stock: '' });
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

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = products.length;
    const bajo = products.filter(p => (p.stock || 0) <= 5).length;
    return {
      total,
      bajo,
      bueno: total - bajo
    };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => 
      (p.name || "").toLowerCase().includes(q) || (p.barcode || "").includes(q)
    );
  }, [products, search]);

  // Función para abrir edición
  const iniciarEdicion = (producto) => {
    setEditandoId(producto.id);
    setDatosEditados({ ...producto });
    setShowAddForm(false);
  };

  // Función para guardar cambios (Nombre, Precio y Stock)
  const guardarCambios = async (id) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: datosEditados.name || datosEditados.nombre, // Soporte para ambos nombres de columna
          name: datosEditados.name,
          precio: parseFloat(datosEditados.price || datosEditados.precio),
          price: parseFloat(datosEditados.price),
          stock: parseInt(datosEditados.stock)
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Éxito', 'Producto actualizado correctamente');
      setEditandoId(null);
      await fetchInitialData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = (data) => {
    setNewProd(prev => ({ ...prev, barcode: data }));
    setIsScannerVisible(false);
  };

  const handleCreateProduct = async () => {
    if (!newProd.barcode || !newProd.name || !newProd.price) {
      Alert.alert('Atención', 'Faltan datos obligatorios');
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
      setNewProd({ barcode: '', name: '', price: '', stock: '' });
      setShowAddForm(false);
      await fetchInitialData();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* HEADER */}
        <View style={s.headerContainer}>
          <Text style={s.headerTitle}>HMS <Text style={s.blue}>STOCK</Text></Text>
          {user?.role === 'encargado' && (
            <TouchableOpacity 
              style={[s.addBtn, showAddForm && s.addBtnActive]} 
              onPress={() => {
                setShowAddForm(!showAddForm);
                if(!showAddForm) setEditandoId(null);
              }}
            >
              <Text style={s.addBtnText}>{showAddForm ? 'CANCELAR' : '+ NUEVO'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MÉTRICAS SUPERIORES */}
        <View style={s.metricsContainer}>
          <View style={s.metricBox}>
            <Package color="#38bdf8" size={20} />
            <Text style={s.metricVal}>{metrics.total}</Text>
            <Text style={s.metricLabel}>TOTAL</Text>
          </View>
          <View style={s.metricBox}>
            <CheckCircle color="#22c55e" size={20} />
            <Text style={s.metricVal}>{metrics.bueno}</Text>
            <Text style={s.metricLabel}>OK</Text>
          </View>
          <View style={s.metricBox}>
            <AlertTriangle color="#ef4444" size={20} />
            <Text style={s.metricVal}>{metrics.bajo}</Text>
            <Text style={s.metricLabel}>BAJO</Text>
          </View>
        </View>

        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
          
          {/* BUSCADOR */}
          <View style={s.searchContainer}>
            <View style={s.searchBar}>
              <Search color="#71717a" size={18} style={{marginRight: 10}} />
              <TextInput 
                style={s.searchInput} 
                placeholder="Buscar por nombre o código..." 
                placeholderTextColor="#71717a"
                value={search} 
                onChangeText={setSearch} 
              />
            </View>
          </View>

          {/* FORMULARIO NUEVO PRODUCTO */}
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
                <TouchableOpacity style={s.miniScanBtn} onPress={() => setIsScannerVisible(true)}>
                  <ScanBarcode color="#000" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={s.cardLabel}>NOMBRE</Text>
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
                  <Text style={s.cardLabel}>STOCK</Text>
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
              <TouchableOpacity style={s.saveBtn} onPress={handleCreateProduct}>
                <Text style={s.saveBtnText}>REGISTRAR PRODUCTO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LISTADO DE TARJETAS */}
          <View style={{ paddingHorizontal: 16 }}>
            {filtered.map(p => {
              const isEditing = editandoId === p.id;
              return (
                <View key={p.id} style={[s.productCard, isEditing && s.productCardEditing]}>
                  {isEditing ? (
                    <View>
                      <TextInput 
                        style={s.editInput} 
                        value={datosEditados.name || datosEditados.nombre} 
                        onChangeText={(t) => setDatosEditados({...datosEditados, name: t, nombre: t})}
                      />
                      <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                        <View style={{flex: 1}}>
                          <Text style={s.cardLabel}>PRECIO $</Text>
                          <TextInput 
                            style={s.editInput} 
                            keyboardType="numeric"
                            value={String(datosEditados.price || datosEditados.precio)} 
                            onChangeText={(t) => setDatosEditados({...datosEditados, price: t, precio: t})}
                          />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={s.cardLabel}>STOCK</Text>
                          <TextInput 
                            style={s.editInput} 
                            keyboardType="numeric"
                            value={String(datosEditados.stock)} 
                            onChangeText={(t) => setDatosEditados({...datosEditados, stock: t})}
                          />
                        </View>
                      </View>
                      <View style={s.editActions}>
                        <TouchableOpacity style={s.btnDone} onPress={() => guardarCambios(p.id)}>
                          <Save size={18} color="#000" />
                          <Text style={s.btnDoneText}>GUARDAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnCancel} onPress={() => setEditandoId(null)}>
                          <X size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={s.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.nameText}>{p.name || p.nombre}</Text>
                        <Text style={s.barcodeText}>{p.barcode}</Text>
                        <Text style={s.priceText}>${p.price || p.precio}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.stockText, p.stock <= 5 ? s.red : s.green]}>
                          {p.stock} Uds.
                        </Text>
                        <TouchableOpacity style={s.editIconButton} onPress={() => iniciarEdicion(p)}>
                          <Edit2 size={18} color="#38bdf8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* MODAL ESCÁNER */}
        <Modal visible={isScannerVisible} animationType="slide">
          <View style={s.modalScanner}>
            <ScannerHibrido onScan={handleBarCodeScanned} />
            <TouchableOpacity style={s.closeCam} onPress={() => setIsScannerVisible(false)}>
              <X color="#fff" size={30} />
            </TouchableOpacity>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  blue: { color: '#38bdf8' },
  
  // Métricas
  metricsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  metricBox: { flex: 1, backgroundColor: '#18181b', padding: 15, borderRadius: 16, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#27272a' },
  metricVal: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 5 },
  metricLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold' },

  // Buscador
  searchContainer: { paddingHorizontal: 16, marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#27272a' },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 },

  // Tarjetas de Producto
  productCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#27272a' },
  productCardEditing: { borderColor: '#38bdf8', borderWidth: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  nameText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  barcodeText: { color: '#71717a', fontSize: 12, marginTop: 2 },
  priceText: { color: '#38bdf8', fontSize: 15, fontWeight: '900', marginTop: 5 },
  stockText: { fontSize: 16, fontWeight: '900' },
  green: { color: '#22c55e' },
  red: { color: '#ef4444' },
  editIconButton: { marginTop: 10, padding: 5 },

  // Inputs Edición
  editInput: { backgroundColor: '#27272a', color: '#fff', borderRadius: 8, padding: 10, fontSize: 15, borderWidth: 1, borderColor: '#3f3f46' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, gap: 10 },
  btnDone: { backgroundColor: '#38bdf8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnDoneText: { color: '#000', fontWeight: 'bold', marginLeft: 5 },
  btnCancel: { backgroundColor: '#3f3f46', padding: 10, borderRadius: 8 },

  // Formulario Nuevo
  addBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  addBtnActive: { backgroundColor: '#ef4444' },
  addBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
  addCard: { backgroundColor: '#18181b', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: '#38bdf840' },
  cardLabel: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 5, marginLeft: 2 },
  input: { backgroundColor: '#27272a', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#3f3f46' },
  inputWithBtn: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  miniScanBtn: { backgroundColor: '#38bdf8', borderRadius: 10, width: 50, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { backgroundColor: '#38bdf8', borderRadius: 10, padding: 15, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900' },

  // Otros
  scroll: { flex: 1 },
  modalScanner: { flex: 1, backgroundColor: '#000' },
  closeCam: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#ef4444', padding: 15, borderRadius: 50 }
});