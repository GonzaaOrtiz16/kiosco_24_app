import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Helpers de formato (puedes moverlos a un archivo utils luego)
const fmt = (n) => new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
}).format(n);

const CartItem = ({ item, onUpdateQty, onRemove }) => {
  return (
    <View style={s.cartRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.cartName}>{item.name || item.title}</Text>
        <Text style={s.cartSub}>{fmt(item.price)}</Text>
      </View>

      <View style={s.qtyControls}>
        <TouchableOpacity 
          style={s.qtyBtn} 
          onPress={() => onUpdateQty(item.id, -1)}
        >
          <Text style={s.qtyTxt}>−</Text>
        </TouchableOpacity>
        
        <Text style={s.qty}>{item.qty}</Text>
        
        <TouchableOpacity 
          style={s.qtyBtn} 
          onPress={() => onUpdateQty(item.id, 1)}
        >
          <Text style={s.qtyTxt}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.cartTotal}>{fmt(item.price * item.qty)}</Text>
      
      <TouchableOpacity onPress={() => onRemove(item.id)} style={s.delBtn}>
        <Text style={s.del}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  cartRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#27272a' 
  },
  cartName: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cartSub: { color: '#71717a', fontSize: 11 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { 
    backgroundColor: '#27272a', 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  qtyTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  qty: { color: '#fff', fontWeight: '900', fontSize: 15, width: 25, textAlign: 'center' },
  cartTotal: { color: '#fff', fontWeight: '900', fontSize: 14, width: 85, textAlign: 'right' },
  delBtn: { paddingLeft: 15 },
  del: { color: '#ef4444', fontSize: 18, fontWeight: 'bold' },
});

// memo evita que el item se re-renderice si sus props no cambian
export default memo(CartItem);