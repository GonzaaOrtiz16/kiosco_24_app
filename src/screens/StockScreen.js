import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { MOCK_PRODUCTS } from '../data/mock';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function StockScreen() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.title.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
  }, [products, search]);

  const save = () => {
    if (!selected || delta === 0) return;
    const newStock = Math.max(0, selected.stock + delta);
    setProducts(prev => prev.map(p => p.id === selected.id ? { ...p, stock: newStock } : p));
    setSelected(prev => ({ ...prev, stock: newStock }));
    setDelta(0);
    Alert.alert('✓ Stock actualizado');
  };

  const stockOk = products.filter(p => p.stock > 3).length;
  const stockLow = products.filter(p => p.stock > 0 && p.stock <= 3).length;
  const stockOut = products.filter(p => p.stock <= 0).length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll}>
        {/* KPIs */}
        <View style={s.kpis}>
          {[['Con Stock', stockOk, '#22c55e'],['Stock Bajo', stockLow, '#eab308'],['Sin Stock', stockOut, '#ef4444']].map(([l,v,c]) => (
            <View key={l} style={[s.kpi, { borderColor: c + '40' }]}>
              <Text style={[s.kpiVal, { color: c }]}>{v}</Text>
              <Text style={s.kpiLabel}>{l}</Text>
            </View>
          ))}
        </View>

        <TextInput style={s.input} placeholder="Buscar producto..." placeholderTextColor="#52525b"
          value={search} onChangeText={t => { setSearch(t); setSelected(null); setDelta(0); }} />

        <View style={s.card}>
          {filtered.map(p => (
            <TouchableOpacity key={p.id} style={[s.row, selected?.id === p.id && s.rowSelected]}
              onPress={() => { setSelected(p); setDelta(0); }}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.title}</Text>
                <Text style={s.brand}>{p.brand}</Text>
              </View>
              <Text style={[s.stock, p.stock <= 0 ? s.red : p.stock <= 3 ? s.yellow : s.green]}>{p.stock} uds</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected && (
          <View style={s.adjCard}>
            <Text style={s.adjTitle}>{selected.title}</Text>
            <Text style={s.adjBarcode}>Código: {selected.barcode}</Text>
            <View style={s.adjRow}>
              <TouchableOpacity style={s.adjBtn} onPress={() => setDelta(d => d - 1)}>
                <Text style={s.adjBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.adjCenter}>
                <Text style={s.adjSub}>STOCK ACTUAL</Text>
                <Text style={s.adjVal}>{selected.stock + delta}</Text>
                {delta !== 0 && <Text style={[s.adjDelta, delta > 0 ? s.green : s.red]}>{delta > 0 ? '+' : ''}{delta}</Text>}
              </View>
              <TouchableOpacity style={[s.adjBtn, s.adjBtnGreen]} onPress={() => setDelta(d => d + 1)}>
                <Text style={s.adjBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.saveBtn, delta === 0 && s.saveBtnDis]} onPress={save} disabled={delta === 0}>
              <Text style={s.saveBtnText}>GUARDAR STOCK</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 16 },
  kpis: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center' },
  kpiVal: { fontSize: 24, fontWeight: '900' },
  kpiLabel: { color: '#71717a', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  input: { backgroundColor: '#18181b', color: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, fontWeight: 'bold', marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
  card: { backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  rowSelected: { borderLeftWidth: 3, borderLeftColor: '#f97316', backgroundColor: '#f9731608' },
  name: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  brand: { color: '#52525b', fontSize: 11, marginTop: 2 },
  stock: { fontWeight: '900', fontSize: 14 },
  green: { color: '#22c55e' }, yellow: { color: '#eab308' }, red: { color: '#ef4444' },
  adjCard: { backgroundColor: '#18181b', borderRadius: 24, padding: 20, marginTop: 12, borderWidth: 1, borderColor: '#27272a', gap: 16 },
  adjTitle: { color: '#fff', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  adjBarcode: { color: '#52525b', fontSize: 11 },
  adjRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#09090b', borderRadius: 20, padding: 16 },
  adjBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#450a0a', justifyContent: 'center', alignItems: 'center' },
  adjBtnGreen: { backgroundColor: '#052e16' },
  adjBtnText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  adjCenter: { alignItems: 'center' },
  adjSub: { color: '#52525b', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  adjVal: { color: '#fff', fontSize: 48, fontWeight: '900' },
  adjDelta: { fontSize: 14, fontWeight: '900' },
  saveBtn: { backgroundColor: '#f97316', borderRadius: 18, padding: 18, alignItems: 'center' },
  saveBtnDis: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});