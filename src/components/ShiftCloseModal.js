import React, { useState, useMemo } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert 
} from 'react-native';
import { LockKeyhole, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import AuthModal from './AuthModal'; // Reutilizamos tu componente actual

export default function ShiftCloseModal({ visible, onClose, user, movements, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);

  // 1. Calculamos el total SOLO de este vendedor antes de cerrar
  const currentShiftTotal = useMemo(() => {
    return movements
      .filter(m => m.movement_type === 'venta' && m.seller_name === user?.full_name)
      .reduce((acc, curr) => acc + (curr.price * Math.abs(curr.quantity)), 0);
  }, [movements, user]);

  const handleOpenPin = () => setShowPin(true);

  const handleAuthSuccess = async () => {
    setShowPin(false);
    await executeClose();
  };

  const executeClose = async () => {
    try {
      setLoading(true);
      const totalToRegister = currentShiftTotal;
      
      // 2. Registramos el evento de cierre en Supabase
      const { error } = await supabase.from('stock_movements').insert([{
        product_id: null, 
        product_title: `CIERRE DE TURNO: ${user?.full_name}`, 
        movement_type: 'cierre_caja', 
        quantity: 0, 
        price: totalToRegister, 
        seller_name: user?.full_name,
        sale_group: new Date().toISOString()
      }]);

      if (error) throw error;

      setFinalTotal(totalToRegister);
      setSummaryVisible(true); // Mostramos el resumen final antes de salir
    } catch (e) {
      Alert.alert('Error', 'No se pudo registrar el cierre de caja.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalExit = () => {
    setSummaryVisible(false);
    onLogout(); // Cerramos la sesión definitivamente
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <Modal visible={visible && !summaryVisible} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.container}>
            <LockKeyhole color="#ef4444" size={48} />
            <Text style={s.title}>Cierre de Caja</Text>
            <Text style={s.description}>
              Se finalizará el turno de <Text style={s.bold}>{user?.full_name}</Text>.
            </Text>
            
            <View style={s.totalBox}>
              <Text style={s.totalLabel}>Total Recaudado (Tu Turno):</Text>
              <Text style={s.totalValue}>{fmt(currentShiftTotal)}</Text>
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.btnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleOpenPin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>CONFIRMAR CIERRE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resumen Final de Cierre */}
      <Modal visible={summaryVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.container, { borderColor: '#22c55e' }]}>
            <CheckCircle2 color="#22c55e" size={60} />
            <Text style={s.title}>¡Caja Cerrada!</Text>
            <Text style={s.summaryTotal}>{fmt(finalTotal)}</Text>
            <Text style={s.description}>Entrega este monto al encargado o al siguiente turno.</Text>
            
            <TouchableOpacity style={s.exitBtn} onPress={handleFinalExit}>
              <Text style={s.btnText}>FINALIZAR Y SALIR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AuthModal 
        visible={showPin} 
        onClose={() => setShowPin(false)} 
        onSuccess={handleAuthSuccess} 
      />
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#18181b', padding: 25, borderRadius: 32, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 15 },
  description: { color: '#71717a', textAlign: 'center', marginTop: 10, fontSize: 14 },
  bold: { color: '#f4f4f5', fontWeight: 'bold' },
  totalBox: { backgroundColor: '#27272a', width: '100%', padding: 20, borderRadius: 20, marginVertical: 20, alignItems: 'center' },
  totalLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: '700' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 5 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 55, backgroundColor: '#3f3f46', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmBtn: { flex: 1, height: 55, backgroundColor: '#ef4444', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  exitBtn: { width: '100%', height: 55, backgroundColor: '#22c55e', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  summaryTotal: { color: '#22c55e', fontSize: 42, fontWeight: '900', marginVertical: 10 }
});

