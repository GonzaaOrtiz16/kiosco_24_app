import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { getMovementsByRange, supabase } from '../lib/supabase';
import HistoryNavigator from '../components/HistoryNavigator';

const PRIMARY_COLOR = '#0ea5e9'; // Celeste azulado

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export default function CierreScreen({ user }) {
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('day'); 
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeLabel, setRangeLabel] = useState('Hoy');
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isEncargado = user?.role === 'encargado';

  const fetchCierre = async (start, end) => {
    setLoading(true);
    try {
      const dateS = start || new Date(new Date().setHours(0, 0, 0, 0));
      const dateE = end || new Date(new Date().setHours(23, 59, 59, 999));
      
      const data = await getMovementsByRange(dateS, dateE);
      setMovements(data || []);
    } catch (error) {
      console.error("Error al cargar movimientos:", error.message);
      Alert.alert("Error", "No se pudieron obtener los movimientos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCierre();
  }, []);

  const handleRangeChange = (start, end, type) => {
    const labels = { day: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año' };
    setTimeFilter(type); 
    setRangeLabel(labels[type]);
    fetchCierre(start, end);
  };

  const onCalendarChange = (event, date) => {
    setShowCalendar(false);
    if (date) {
      setSelectedDate(date);
      setTimeFilter('custom'); 
      setRangeLabel(date.toLocaleDateString('es-AR'));
      
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      
      fetchCierre(start, end);
    }
  };

  const handleAnular = async (saleGroup) => {
    if (!isEncargado) {
        Alert.alert("Acceso denegado", "Solo un encargado puede anular ventas.");
        return;
    }

    Alert.alert(
      "Anular Venta",
      "¿Estás seguro de que quieres anular esta venta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from('stock_movements')
              .insert([{
                sale_group: saleGroup,
                movement_type: 'anulacion',
                seller_name: user?.full_name || 'Admin',
                product_title: 'ANULACIÓN MANUAL',
                quantity: 0,
                price: 0
              }]);
            
            if (error) {
              Alert.alert("Error", "No se pudo anular.");
            } else {
              fetchCierre(); 
            }
          }
        }
      ]
    );
  };

  // ── PROCESAMIENTO DE DATOS ─────────────────────
  const todasVentas = movements.filter(m => m.movement_type === 'venta');
  const todasAnulaciones = movements.filter(m => m.movement_type === 'anulacion');
  const checkVoided = (sg) => todasAnulaciones.some(m => m.sale_group === sg);

  const filteredMovements = useMemo(() => {
    if (isEncargado) return todasVentas;
    return todasVentas.filter(m => m.seller_name === user?.full_name);
  }, [todasVentas, user, isEncargado]);

  const groups = useMemo(() => {
    const g = {};
    filteredMovements.forEach(m => { 
        if (!g[m.sale_group]) g[m.sale_group] = []; 
        g[m.sale_group].push(m); 
    });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [filteredMovements]);

  const activeGroups = groups.filter(([sg]) => !checkVoided(sg));
  const voidedGroups = groups.filter(([sg]) => checkVoided(sg));

  const totalRevenue = activeGroups.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity)*m.price, 0), 0);
  const totalUnits = activeGroups.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity), 0), 0);

  const bySeller = useMemo(() => {
    if (!isEncargado) return [];
    const acc = {};
    activeGroups.forEach(([,items]) => items.forEach(m => {
      const sName = m.seller_name || 'Desconocido';
      if (!acc[sName]) acc[sName] = { revenue: 0, units: 0 };
      acc[sName].revenue += m.price * Math.abs(m.quantity);
      acc[sName].units += Math.abs(m.quantity);
    }));
    return Object.entries(acc).sort(([,a],[,b]) => b.revenue - a.revenue);
  }, [activeGroups, isEncargado]);

  const displayList = filter === 'voided' ? voidedGroups : filter === 'active' ? activeGroups : groups;

  if (loading) return (
    <View style={[s.safe, {justifyContent:'center'}]}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large"/>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll}>
        
        {isEncargado && (
          <View style={{ marginBottom: 12 }}>
            <HistoryNavigator 
                onRangeChange={handleRangeChange} 
                activeTab={timeFilter} 
            />
            
            {/* Lógica Dual: Web o App */}
            {Platform.OS === 'web' ? (
              <View style={s.webCalendarBox}>
                <Text style={s.calendarLabel}>SELECCIONAR FECHA ESPECÍFICA</Text>
                <input 
                  type="date" 
                  style={s.webDateInput}
                  onChange={(e) => {
                    const d = new Date(e.target.value + "T00:00:00");
                    onCalendarChange(null, d);
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity 
                style={s.calendarBtn} 
                onPress={() => setShowCalendar(true)}
              >
                <Text style={s.calendarBtnText}>📅 BUSCAR POR FECHA ESPECÍFICA</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showCalendar && Platform.OS !== 'web' && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onCalendarChange}
            maximumDate={new Date()}
          />
        )}

        {/* INDICADORES (KPIs) */}
        <View style={s.kpis}>
          {[
            ['Recaudado', fmt(totalRevenue), PRIMARY_COLOR],
            ['Unidades', totalUnits, '#a78bfa'],
            ['Ventas', activeGroups.length, '#22c55e'],
            ['Anuladas', voidedGroups.length, '#ef4444'],
          ].map(([l,v,c]) => (
            <View key={l} style={[s.kpi, { borderColor: c + '40' }]}>
              <Text style={[s.kpiVal, { color: c }]}>{v}</Text>
              <Text style={s.kpiLabel}>{isEncargado ? l : `${l} mías`}</Text>
            </View>
          ))}
        </View>

        {/* DESGLOSE POR VENDEDOR */}
        {isEncargado && bySeller.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>DESGLOSE POR VENDEDOR ({rangeLabel})</Text>
            {bySeller.map(([name, data]) => (
              <View key={name} style={s.sellerRow}>
                <View>
                  <Text style={s.sellerName}>{name}</Text>
                  <Text style={s.sellerSub}>{data.units} unidades</Text>
                </View>
                <Text style={s.sellerAmt}>{fmt(data.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SELECTOR DE FILTROS (Activas/Anuladas) */}
        <View style={s.tabs}>
          {[['all','Todas'],['active','Activas'],['voided','Anuladas']].map(([k,l]) => (
            <TouchableOpacity 
                key={k} 
                style={[s.tab, filter===k && s.tabActive]} 
                onPress={() => setFilter(k)}
            >
              <Text style={[s.tabText, filter===k && s.tabTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LISTADO DE VENTAS */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {isEncargado ? `MOVIMIENTOS: ${rangeLabel.toUpperCase()}` : "MIS VENTAS DE HOY"}
          </Text>
          {displayList.length === 0 && <Text style={s.empty}>Sin movimientos en este período</Text>}
          {displayList.map(([sg, items]) => {
            const vd = checkVoided(sg);
            const sub = items.reduce((s,m) => s + Math.abs(m.quantity)*m.price, 0);
            return (
              <TouchableOpacity 
                key={sg} 
                style={[s.saleRow, vd && { opacity: 0.4 }]}
                onLongPress={() => !vd && isEncargado && handleAnular(sg)}
                disabled={!isEncargado || vd}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.saleTime}>
                    {new Date(sg).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})} - {timeStr(sg)} 
                    {isEncargado ? ` · ${items[0].seller_name}` : ''}
                  </Text>
                  {items.map(m => (
                    <Text key={m.id} style={s.saleItem}>
                        {m.product_title} <Text style={{color: '#52525b'}}>x{Math.abs(m.quantity)}</Text>
                    </Text>
                  ))}
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={[s.saleAmt, vd && { textDecorationLine: 'line-through', color: '#71717a' }]}>
                    {fmt(sub)}
                  </Text>
                  {vd && <Text style={s.voidedBadge}>ANULADA</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TICKET DE CIERRE */}
        <View style={s.ticket}>
          <Text style={s.ticketTitle}>HMS KIOSCO 24HS — {isEncargado ? `CIERRE ${rangeLabel.toUpperCase()}` : 'RESUMEN HOY'}</Text>
          <Text style={s.ticketSub}>
            Usuario: {user?.full_name} · {new Date().toLocaleDateString('es-AR')}
          </Text>
          <Text style={s.ticketTotal}>{fmt(totalRevenue)}</Text>
          <Text style={s.ticketSub}>{activeGroups.length} ventas en el período</Text>
          <TouchableOpacity style={s.refreshBtn} onPress={() => {
              setTimeFilter('day');
              setRangeLabel('Hoy');
              fetchCierre();
          }}>
              <Text style={s.refreshText}>RESETEAR A HOY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 16 },
  // Estilo para Web
  webCalendarBox: { backgroundColor: '#18181b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#27272a', marginTop: -4 },
  calendarLabel: { color: '#71717a', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  webDateInput: { backgroundColor: '#09090b', color: '#fff', border: '1px solid #27272a', borderRadius: 8, padding: 8, width: '100%', cursor: 'pointer' },
  
  calendarBtn: { backgroundColor: '#18181b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#27272a', alignItems: 'center', marginTop: -4 },
  calendarBtnText: { color: '#a1a1aa', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, minWidth: '45%', backgroundColor: '#18181b', borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { color: '#71717a', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  card: { backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a', padding: 16, marginBottom: 12 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  sellerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  sellerName: { color: '#fff', fontWeight: '900', fontSize: 13 },
  sellerSub: { color: '#52525b', fontSize: 11 },
  sellerAmt: { color: PRIMARY_COLOR, fontWeight: '900', fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#18181b', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  tabActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  tabText: { color: '#71717a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  tabTextActive: { color: '#fff' },
  saleRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  saleTime: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  saleItem: { color: '#a1a1aa', fontSize: 12, marginBottom: 2 },
  saleAmt: { color: '#fff', fontWeight: '900', fontSize: 14 },
  voidedBadge: { color: '#ef4444', fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  empty: { color: '#52525b', textAlign: 'center', fontSize: 12, paddingVertical: 24 },
  ticket: { backgroundColor: '#09090b', borderWidth: 1, borderStyle: 'dashed', borderColor: '#27272a', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 40, gap: 6 },
  ticketTitle: { color: '#71717a', fontSize: 11, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  ticketSub: { color: '#52525b', fontSize: 12, textAlign: 'center' },
  ticketTotal: { color: '#fff', fontSize: 38, fontWeight: '900', fontStyle: 'italic', marginVertical: 8 },
  refreshBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#18181b' },
  refreshText: { color: PRIMARY_COLOR, fontSize: 10, fontWeight: '900' }
});

