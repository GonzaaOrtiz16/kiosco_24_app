import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const fmt = (n) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
}).format(n);

// Función para mostrar la hora real de Argentina
const timeStr = (iso) => {
  if (!iso) return "--:--";
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  } catch (e) {
    return "--:--";
  }
};

const HistorySection = ({ groups, isVoided, onVoid }) => {
  return (
    <View style={s.container}>
      <Text style={s.cardTitle}>MIS VENTAS DE HOY</Text>
      
      {groups.length === 0 && (
        <View style={s.emptyContainer}>
          <Text style={s.emptyText}>No hay ventas registradas en este turno.</Text>
        </View>
      )}

      {groups.map(([sg, data]) => {
        // 'data' contiene { items, dbTime }
        const items = data.items || [];
        const dbTime = data.dbTime || sg; 
        
        const voided = isVoided(sg);
        const totalSale = items.reduce((acc, curr) => acc + (curr.price * Math.abs(curr.quantity)), 0);
        
        return (
          <View key={sg} style={[s.historyCard, voided && s.voidedOpacity]}>
            <View style={s.historyHeader}>
              <View style={s.timeBadge}>
                <Text style={s.historyTime}>{timeStr(dbTime)}</Text>
              </View>
              
              <Text style={s.historyTotal}>{fmt(totalSale)}</Text>
              
              {!voided ? (
                <TouchableOpacity 
                  onPress={() => onVoid(sg, items)} 
                  style={s.voidBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  <Text style={s.voidBtnText}>ANULAR</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.voidedBadgeContainer}>
                   <Text style={s.voidedBadge}>ANULADA</Text>
                </View>
              )}
            </View>

            <View style={s.itemsList}>
              {items.map((it, idx) => (
                <Text key={idx} style={s.historyItemText}>
                  <Text style={s.qtyText}>{Math.abs(it.quantity)}x</Text> {it.product_title}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  container: { marginTop: 24, paddingBottom: 20 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', marginBottom: 12, letterSpacing: 1 },
  emptyContainer: { 
    padding: 20, 
    backgroundColor: '#18181b', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#27272a',
    borderStyle: 'dashed' 
  },
  emptyText: { color: '#52525b', fontSize: 12, textAlign: 'center' },
  historyCard: { 
    backgroundColor: '#18181b', 
    padding: 15, 
    borderRadius: 18, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  voidedOpacity: { opacity: 0.4 },
  historyHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    paddingBottom: 10
  },
  timeBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  historyTime: { color: '#a1a1aa', fontSize: 11, fontWeight: '800' },
  historyTotal: { color: '#fff', fontSize: 16, fontWeight: '900', marginLeft: 12, flex: 1 },
  itemsList: { gap: 4 },
  historyItemText: { color: '#71717a', fontSize: 12, fontWeight: '500' },
  qtyText: { color: '#38bdf8', fontWeight: '800' },
  voidBtn: { 
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  voidBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '900' },
  voidedBadgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  voidedBadge: { color: '#52525b', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});

export default memo(HistorySection);
