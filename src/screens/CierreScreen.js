import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

export default function CierreScreen({ user, movements = [] }) {
  const [filter, setFilter] = useState('all');

  const ventas = movements.filter(m => m.movement_type === 'venta');
  const anulaciones = movements.filter(m => m.movement_type === 'anulacion');
  const isVoided = (sg) => anulaciones.some(m => m.sale_group === sg);

  const groups = useMemo(() => {
    const g = {};
    ventas.forEach(m => { if (!g[m.sale_group]) g[m.sale_group] = []; g[m.sale_group].push(m); });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [ventas]);

  const active = groups.filter(([sg]) => !isVoided(sg));
  const voided = groups.filter(([sg]) => isVoided(sg));

  const totalRevenue = active.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity)*m.price, 0), 0);
  const totalUnits = active.reduce((s,[,items]) => s + items.reduce((ss,m) => ss + Math.abs(m.quantity), 0), 0);

  const bySeller = useMemo(() => {
    const acc = {};
    active.forEach(([,items]) => items.forEach(m => {
      if (!acc[m.seller_name]) acc[m.seller_name] = { revenue: 0, units: 0 };
      acc[m.seller_name].revenue += m.price * Math.abs(m.quantity);
      acc[m.seller_name].units += Math.abs(m.quantity);
    }));
    return Object.entries(acc).sort(([,a],[,b]) => b.revenue - a.revenue);
  }, [active]);

  const display = filter === 'voided' ? voided : filter === 'active' ? active : groups;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll}>
        {/* KPIs */}
        <View style={s.kpis}>
          {[
            ['Recaudado', fmt(totalRevenue), '#f97316'],
            ['Unidades', totalUnits, '#a78bfa'],
            ['Ventas', active.length, '#22c55e'],
            ['Anuladas', voided.length, '#ef4444'],
          ].map(([l,v,c]) => (
            <View key={l} style={[s.kpi, { borderColor: c + '40' }]}>
              <Text style={[s.kpiVal, { color: c }]}>{v}</Text>
              <Text style={s.kpiLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* By seller */}
        {bySeller.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>DESGLOSE POR VENDEDOR</Text>
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

        {/* Filter */}
        <View style={s.tabs}>
          {[['all','Todas'],['active','Activas'],['voided','Anuladas']].map(([k,l]) => (
            <TouchableOpacity key={k} style={[s.tab, filter===k && s.tabActive]} onPress={() => setFilter(k)}>
              <Text style={[s.tabText, filter===k && s.tabTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sales list */}
        <View style={s.card}>
          {display.length === 0 && <Text style={s.empty}>Sin ventas</Text>}
          {display.map(([sg, items]) => {
            const vd = isVoided(sg);
            const sub = items.reduce((s,m) => s + Math.abs(m.quantity)*m.price, 0);
            return (
              <View key={sg} style={[s.saleRow, vd && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.saleTime}>{timeStr(sg)} · {items[0].seller_name}</Text>
                  {items.map(m => <Text key={m.id} style={s.saleItem}>{m.product_title} x{Math.abs(m.quantity)}</Text>)}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.saleAmt, vd && { textDecorationLine: 'line-through', color: '#52525b' }]}>{fmt(sub)}</Text>
                  {vd && <Text style={s.voidedBadge}>ANULADA</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Ticket */}
        <View style={s.ticket}>
          <Text style={s.ticketTitle}>RAFAGHELLI MOTOS — CIERRE DE TURNO</Text>
          <Text style={s.ticketSub}>{user.name} · {new Date().toLocaleDateString('es-AR')}</Text>
          <Text style={s.ticketTotal}>{fmt(totalRevenue)}</Text>
          <Text style={s.ticketSub}>{active.length} ventas · {totalUnits} unidades</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { padding: 16 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: { flex: 1, minWidth: '45%', backgroundColor: '#18181b', borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { color: '#71717a', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  card: { backgroundColor: '#18181b', borderRadius: 24, borderWidth: 1, borderColor: '#27272a', padding: 16, marginBottom: 12, gap: 2 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  sellerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  sellerName: { color: '#fff', fontWeight: '900', fontSize: 13 },
  sellerSub: { color: '#52525b', fontSize: 11 },
  sellerAmt: { color: '#f97316', fontWeight: '900', fontSize: 14 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#18181b', borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  tabActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  tabText: { color: '#71717a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  tabTextActive: { color: '#fff' },
  saleRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  saleTime: { color: '#71717a', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  saleItem: { color: '#a1a1aa', fontSize: 11 },
  saleAmt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  voidedBadge: { color: '#ef4444', fontSize: 9, fontWeight: '900', marginTop: 2 },
  empty: { color: '#52525b', textAlign: 'center', fontSize: 12, paddingVertical: 16 },
  ticket: { backgroundColor: '#09090b', borderWidth: 1, borderStyle: 'dashed', borderColor: '#27272a', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 32, gap: 4 },
  ticketTitle: { color: '#52525b', fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  ticketSub: { color: '#52525b', fontSize: 11, textAlign: 'center' },
  ticketTotal: { color: '#fff', fontSize: 32, fontWeight: '900', fontStyle: 'italic' },
});