import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const HistorySection = ({ groups, isVoided, onVoid }) => {
  return (
    <View style={s.container}>
      <Text style={s.cardTitle}>MIS VENTAS DE HOY</Text>
      
      {groups.length === 0 && (
        <Text style={s.emptyText}>No hay ventas registradas.</Text>
      )}

      {groups.map(([sg, items]) => {
        const voided = isVoided(sg);
        const totalSale = items.reduce((acc, curr) => acc + (curr.price * Math.abs(curr.quantity)), 0);
        
        return (
          <View key={sg} style={[s.historyCard, voided && s.voidedOpacity]}>
            <View style={s.historyHeader}>
              <Text style={s.historyTime}>{timeStr(sg)}</Text>
              <Text style={s.historyTotal}>{fmt(totalSale)}</Text>
              
              {!voided ? (
                <TouchableOpacity 
                  onPress={() => onVoid(sg, items)} 
                  style={s.voidBtn}
                >
                  <Text style={s.voidBtnText}>ANULAR</Text>
                </TouchableOpacity>
              ) : (
                <Text style={s.voidedBadge}>ANULADA</Text>
              )}
            </View>

            {items.map((it, idx) => (
              <Text key={idx} style={s.historyItemText}>
                {Math.abs(it.quantity)}x {it.product_title}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  container: { marginTop: 24 },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', marginBottom: 12 },
  emptyText: { color: '#52525b', fontSize: 12, textAlign: 'center', marginTop: 10 },
  historyCard: { 
    backgroundColor: '#18181b', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  voidedOpacity: { opacity: 0.5 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyTime: { color: '#71717a', fontSize: 12, fontWeight: 'bold' },
  historyTotal: { color: '#fff', fontSize: 14, fontWeight: '900', marginLeft: 10, flex: 1 },
  historyItemText: { color: '#a1a1aa', fontSize: 11 },
  voidBtn: { backgroundColor: '#452222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  voidBtnText: { color: '#f87171', fontSize: 10, fontWeight: 'bold' },
  voidedBadge: { color: '#52525b', fontSize: 10, fontWeight: 'bold', fontStyle: 'italic' },
});

export default memo(HistorySection);