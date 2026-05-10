import React, { useState, useMemo } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, TextInput 
} from 'react-native';
import { LockKeyhole, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export default function ShiftCloseModal({ visible, onClose, user, movements, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [userPin, setUserPin] = useState('');
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);

  // Calculamos el total del turno actual para este vendedor
  const currentShiftTotal = useMemo(() => {
    return movements
      .filter(m => m.movement_type === 'venta' && m.seller_name === user?.full_name)
      .reduce((acc, curr) => acc + (curr.price * Math.abs(curr.quantity)), 0);
  }, [movements, user]);

  const handleConfirmarCierre = async () => {
    // 1. Validaciones iniciales
    if (!userPin) {
      Alert.alert("PIN Requerido", "Por favor, ingresá tu PIN para confirmar el cierre.");
      return;
    }

    // 2. Verificación de PIN propio (asumiendo que user.pin contiene el PIN del usuario)
    if (userPin !== user?.pin) {
      Alert.alert("PIN Incorrecto", "El PIN ingresado no coincide con tu usuario.");
      setUserPin('');
      return;
    }

    await executeClose();
  };

  const executeClose = async () => {
    try {
      setLoading(true);
      const totalToRegister = currentShiftTotal;
      
      // Registro del evento de cierre en la base de datos
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
      setSummaryVisible(true); 
    } catch (e) {
      Alert.alert('Error', 'No se pudo registrar el cierre de caja.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalExit = () => {
    setSummaryVisible(false);
    onLogout(); 
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

            {/* CAMPO DE PIN INTEGRADO */}
            <View style={s.inputWrapper}>
              <Text style={s.inputLabel}>INGRESÁ TU PIN PARA CERRAR</Text>
              <TextInput
                style={s.pinInput}
                placeholder="****"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                secureTextEntry={true}
                maxLength={4}
                value={userPin}
                onChangeText={setUserPin}
              />
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={s.btnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.confirmBtn, !userPin && { opacity: 0.5 }]} 
                onPress={handleConfirmarCierre} 
                disabled={loading}
              >
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
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#18181b', padding: 25, borderRadius: 32, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 15 },
  description: { color: '#71717a', textAlign: 'center', marginTop: 10, fontSize: 14 },
  bold: { color: '#f4f4f5', fontWeight: 'bold' },
  totalBox: { backgroundColor: '#09090b', width: '100%', padding: 20, borderRadius: 20, marginTop: 20, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  totalLabel: { color: '#71717a', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 5 },
  inputWrapper: { width: '100%', marginVertical: 20, alignItems: 'center' },
  inputLabel: { color: '#ef4444', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  pinInput: { 
    backgroundColor: '#27272a', 
    width: '100%', 
    height: 60, 
    borderRadius: 16, 
    color: '#fff', 
    fontSize: 28, 
    textAlign: 'center', 
    fontWeight: '900',
    letterSpacing: 10 
  },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 55, backgroundColor: '#3f3f46', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmBtn: { flex: 1, height: 55, backgroundColor: '#ef4444', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  exitBtn: { width: '100%', height: 55, backgroundColor: '#22c55e', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  summaryTotal: { color: '#22c55e', fontSize: 42, fontWeight: '900', marginVertical: 10 }
});
