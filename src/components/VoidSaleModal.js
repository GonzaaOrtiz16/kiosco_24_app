import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase, insertMovements, updateStock } from '../lib/supabase';
import { AlertCircle, CheckCircle2, X } from 'lucide-react-native';

const VoidSaleModal = ({ visible, onClose, saleData, user, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  if (!saleData) return null;

  const { sg, items } = saleData;

  const handleVoid = async () => {
    try {
      setLoading(true);

      // 1. Insertar movimientos de anulación
      const voids = items.map(m => ({ 
        product_id: m.product_id, 
        product_title: m.product_title, 
        movement_type: 'anulacion', 
        quantity: Math.abs(m.quantity), 
        price: m.price, 
        seller_name: user?.full_name, 
        sale_group: sg 
      }));

      const { error: insertError } = await supabase.from('stock_movements').insert(voids);
      if (insertError) throw insertError;

      // 2. Devolver stock (Consultando DB para seguridad)
      for (const item of items) {
        const { data: dbProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (dbProd) {
          await updateStock(item.product_id, dbProd.stock + Math.abs(item.quantity));
        }
      }

      Alert.alert('Éxito', 'Venta anulada correctamente');
      onRefresh(); // Para recargar los movimientos en el POS
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo completar la anulación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.modal}>
          <AlertCircle color="#ef4444" size={48} style={{ marginBottom: 15 }} />
          <Text style={s.title}>¿Anular esta venta?</Text>
          <Text style={s.sub}>Se devolverá el stock a los productos correspondientes.</Text>
          
          <View style={s.btnRow}>
            <TouchableOpacity 
              style={[s.btn, s.btnCancel]} 
              onPress={onClose} 
              disabled={loading}
            >
              <Text style={s.btnText}>CANCELAR</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.btn, s.btnConfirm]} 
              onPress={handleVoid}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>SÍ, ANULAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#18181b', borderRadius: 24, padding: 25, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  sub: { color: '#a1a1aa', textAlign: 'center', fontSize: 14, marginBottom: 25 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnCancel: { backgroundColor: '#27272a' },
  btnConfirm: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 13 }
});

export default VoidSaleModal;
