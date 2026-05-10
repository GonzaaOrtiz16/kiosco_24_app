import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { getMovementsByRange, supabase } from '../lib/supabase';
import HistoryNavigator from '../components/HistoryNavigator';

const PRIMARY_COLOR = '#0ea5e9';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export default function CierreScreen({ user }) {
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('turno'); 
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeLabel, setRangeLabel] = useState('Turno Actual');
  const [turnoStartTime, setTurnoStartTime] = useState(null);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Verificamos si es encargado o admin
  const isEncargado = user?.role === 'encargado' || user?.role === 'admin';

  const getTurnoStart = async () => {
    try {
      const { data } = await supabase
        .from('stock_movements')
        .select('created_at')
        .eq('movement_type', 'cierre_caja')
        .eq('seller_name', user?.full_name)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) return data[0].created_at;
      return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    } catch (e) {
      return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    }
  };

  const fetchCierre = useCallback(async (start, end, isTurno = false) => {
    setLoading(true);
    try {
      let dateS = start;
      let dateE = end || new Date(new Date().setHours(23, 59, 59, 999));

      // Si no es encargado, forzamos siempre la búsqueda por su turno
      const forceTurno = !isEncargado || isTurno;

      if (forceTurno) {
        const startTime = await getTurnoStart();
        setTurnoStartTime(startTime);
        dateS = new Date(startTime);
        setRangeLabel(isEncargado ? 'Turno Actual' : 'Mi Turno Actual');
      } else if (!start) {
        dateS = new Date(new Date().setHours(0, 0, 0, 0));
      }
      
      const data = await getMovementsByRange(dateS, dateE);

      // FILTRO DE PRIVACIDAD: El vendedor solo ve sus movimientos, el encargado ve todo
      const filteredData = isEncargado 
        ? data 
        : data.filter(m => m.seller_name === user?.full_name);

      setMovements(filteredData || []);
    } catch (error) {
      Alert.alert("Error", "No se pudieron obtener los movimientos.");
    } finally {
      setLoading(false);
    }
  }, [user, isEncargado]);

  useEffect(() => {
    fetchCierre(null, null, timeFilter === 'turno' || !isEncargado);
  }, [fetchCierre, isEncargado]);

  // Lógica ON/OFF para los filtros (Solo Encargados)
  const handleRangeChange = (start, end, type) => {
    if (!isEncargado) return;

    if (type === timeFilter) {
      setTimeFilter('turno');
      fetchCierre(null, null, true);
    } else {
      setTimeFilter(type); 
      setRangeLabel({ day: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año' }[type] || 'Personalizado');
      fetchCierre(start, end, false);
    }
  };

  const onCalendarChange = (event, date) => {
    setShowCalendar(false);
    if (date && isEncargado) {
      setSelectedDate(date);
      setTimeFilter('custom'); 
      setRangeLabel(date.toLocaleDateString('es-AR'));
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      fetchCierre(start, end, false);
    }
  };

  const handleAnular = async (saleGroup) => {
    if (!isEncargado) return;
    Alert.alert("Anular Venta","¿Confirmas la anulación?",[
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: async () => {
          const { error } = await supabase.from('stock_movements').insert([{
            sale_group: saleGroup, movement_type: 'anulacion', seller_name: user?.full_name, product_title: 'ANULACIÓN MANUAL', quantity: 0, price: 0
          }]);
          if (!error) fetchCierre(null, null, timeFilter === 'turno');
      }}
    ]);
  };

  // ── PROCESAMIENTO DE DATOS ─────────────────────
  const todasVentas = movements.filter(m => m.movement_type === 'venta');
  const todasAnulaciones = movements.filter(m => m.movement_type === 'anulacion');
  const checkVoided = (sg) => todasAnulaciones.some(m => m.sale_group === sg);

  const groups = useMemo(() => {
    const g = {};
    todasVentas.forEach(m => { 
        if (!g[m.sale_group]) g[m.sale_group] = []; 
        g[m.sale_group].push(m); 
    });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [todasVentas]);

  const activeGroups = groups.filter(([sg]) => !checkVoided(sg));
  const voidedGroups = groups.filter(([sg]) => checkVoided(sg));

  const totalRevenue = activeGroups.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity)*m.price, 0), 0);
  const totalUnits = activeGroups.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity), 0), 0);

  const displayList = filter === 'voided' ? voidedGroups : filter === 'active' ? activeGroups : groups;

  if (loading) return (
    <View style={[s.safe, {justifyContent:'center'}]}>
        <ActivityIndicator color={PRIMARY_COLOR} size="large"/>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll}>
        
        {/* SOLO EL ENCARGADO VE LOS FILTROS DE TIEMPO Y CALENDARIO */}
        {isEncargado && (
          <View style={{ marginBottom: 12 }}>
            <HistoryNavigator 
                onRangeChange={handleRangeChange} 
                activeTab={timeFilter} 
            />
            
            {Platform.OS === 'web' ? (
              <View style={s.webCalendarBox}>
                <Text style={s.calendarLabel}>BUSCAR FECHA</Text>
                <input type="date" style={s.webDateInput} onChange={(e) => {
                  if (!e.target.value) return;
                  onCalendarChange(null, new Date(e.target.value + "T00:00:00"));
                }} />
              </View>
            ) : (
              <TouchableOpacity style={s.calendarBtn} onPress={() => setShowCalendar(true)}>
                <Text style={[s.calendarBtnText, timeFilter === 'custom' && {color: PRIMARY_COLOR}]}>
                  {timeFilter === 'custom' ? `📅 FECHA: ${rangeLabel}` : '📅 BUSCAR POR FECHA'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showCalendar && Platform.OS !== 'web' && (
          <DateTimePicker value={selectedDate} mode="date" display="default" onChange={onCalendarChange} maximumDate={new Date()} />
        )}

        <View style={s.kpis}>
          {[
            ['Recaudado', fmt(totalRevenue), PRIMARY_COLOR],
            ['Unidades', totalUnits, '#a78bfa'],
            ['Ventas', activeGroups.length, '#22c55e'],
            ['Anuladas', voidedGroups.length, '#ef4444'],
          ].map(([l,v,c]) => (
            <View key={l} style={[s.kpi, { borderColor: c + '40' }]}>
              <Text style={[s.kpiVal, { color: c }]}>{v}</Text>
              <Text style={s.kpiLabel}>{l} {(!isEncargado || timeFilter === 'turno') ? (isEncargado ? 'del turno' : 'de tu turno') : ''}</Text>
            </View>
          ))}
        </View>

        <View style={s.tabs}>
          {[['all','Todas'],['active','Activas'],['voided','Anuladas']].map(([k,l]) => (
            <TouchableOpacity key={k} style={[s.tab, filter===k && s.tabActive]} onPress={() => setFilter(k)}>
              <Text style={[s.tabText, filter===k && s.tabTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{rangeLabel.toUpperCase()}</Text>
          {displayList.length === 0 && <Text style={s.empty}>Sin movimientos</Text>}
          {displayList.map(([sg, items]) => {
            const vd = checkVoided(sg);
            const sub = items.reduce((s,m) => s + Math.abs(m.quantity)*m.price, 0);
            return (
              <TouchableOpacity key={sg} style={[s.saleRow, vd && { opacity: 0.4 }]} onLongPress={() => !vd && isEncargado && handleAnular(sg)} disabled={!isEncargado || vd}>
                <View style={{ flex: 1 }}>
                  <Text style={s.saleTime}>
                    {new Date(sg).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})} - {timeStr(sg)} 
                    {isEncargado ? ` · ${items[0].seller_name}` : ''}
                  </Text>
                  {items.map(m => (<Text key={m.id} style={s.saleItem}>{m.product_title} <Text style={{color: '#52525b'}}>x{Math.abs(m.quantity)}</Text></Text>))}
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={[s.saleAmt, vd && { textDecorationLine: 'line-through', color: '#71717a' }]}>{fmt(sub)}</Text>
                  {vd && <Text style={s.voidedBadge}>ANULADA</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.ticket}>
          <Text style={s.ticketTitle}>HMS KIOSCO 24HS — {rangeLabel.toUpperCase()}</Text>
          <Text style={s.ticketSub}>{user?.full_name} · {new Date().toLocaleDateString('es-AR')}</Text>
          <Text style={s.ticketTotal}>{fmt(totalRevenue)}</Text>
          
          <TouchableOpacity 
            style={[s.refreshBtn, timeFilter === 'turno' && {backgroundColor: PRIMARY_COLOR + '20', borderColor: PRIMARY_COLOR}]} 
            onPress={() => { setTimeFilter('turno'); fetchCierre(null, null, true); }}
          >
              <Text style={[s.refreshText, timeFilter === 'turno' && {color: PRIMARY_COLOR}]}>
                {isEncargado ? (timeFilter === 'turno' ? 'TURNO ACTUAL ACTIVO' : 'VOLVER AL TURNO ACTUAL') : 'ACTUALIZAR MI TURNO'}
              </Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 16 },
  webCalendarBox: { backgroundColor: '#18181b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#27272a', marginTop: -4 },
  calendarLabel: { color: '#71717a', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  webDateInput: { backgroundColor: '#09090b', color: '#fff', border: '1px solid #27272a', borderRadius: 12, padding: 10, width: '100%', textAlign: 'center', fontSize: 14 },
  calendarBtn: { backgroundColor: '#18181b', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#27272a', alignItems: 'center', marginTop: -4 },
  calendarBtnText: { color: '#a1a1aa', fontSize: 10, fontWeight: '900' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, minWidth: '45%', backgroundColor: '#18181b', borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { color: '#71717a', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  card: { backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a', padding: 16, marginBottom: 12 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#18181b', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  tabActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  tabText: { color: '#71717a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  tabTextActive: { color: '#fff' },
  saleRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  saleTime: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  saleItem: { color: '#a1a1aa', fontSize: 12, marginBottom: 2 },
  saleAmt: { color: '#fff', fontWeight: '900', fontSize: 14 },
  voidedBadge: { color: '#ef4444', fontSize: 9, fontWeight: '900', marginTop: 4 },
  empty: { color: '#52525b', textAlign: 'center', fontSize: 12, paddingVertical: 24 },
  ticket: { backgroundColor: '#09090b', borderWidth: 1, borderStyle: 'dashed', borderColor: '#27272a', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 40, gap: 6 },
  ticketTitle: { color: '#71717a', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  ticketSub: { color: '#52525b', fontSize: 12, textAlign: 'center' },
  ticketTotal: { color: '#fff', fontSize: 38, fontWeight: '900', marginVertical: 8 },
  refreshBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: 'transparent' },
  refreshText: { color: '#52525b', fontSize: 10, fontWeight: '900' }
});

