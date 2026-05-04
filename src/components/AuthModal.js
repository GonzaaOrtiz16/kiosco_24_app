import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  Modal, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthModal({ visible, onClose, onSuccess }) {
  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const pinRef = useRef(null);

  // Cada vez que el modal se hace visible, limpiamos y damos foco al PIN
  useEffect(() => {
    if (visible) {
      setPinInput('');
      // Pequeño delay para asegurar que el Modal terminó de renderizar en PC/Android
      const timer = setTimeout(() => pinRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleVerify = async () => {
    if (!pinInput || pinInput.length < 4) return;
    
    setIsVerifying(true);
    try {
      // Buscamos si existe un encargado con ese PIN
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('pin', pinInput)
        .eq('role', 'encargado')
        .single();

      if (data) {
        onSuccess(); // Ejecuta la anulación en el padre
        onClose();   // Cierra el modal
      } else {
        Alert.alert("Denegado", "PIN incorrecto o sin permisos de encargado.");
        setPinInput('');
        pinRef.current?.focus();
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>Autorización Requerida</Text>
          <Text style={s.modalSub}>Un encargado debe ingresar su PIN para anular la venta.</Text>
          
          <TextInput
            ref={pinRef}
            style={s.modalInput}
            placeholder="PIN"
            placeholderTextColor="#52525b"
            keyboardType="numeric"
            secureTextEntry
            value={pinInput}
            onChangeText={setPinInput}
            // En PC: permite presionar Enter para enviar
            onSubmitEditing={handleVerify}
            // Evita que el foco se escape
            onBlur={() => { if(visible) pinRef.current?.focus(); }}
          />

          <View style={s.buttonRow}>
            <TouchableOpacity 
              style={[s.modalBtn, s.cancelBtn]} 
              onPress={onClose}
              disabled={isVerifying}
            >
              <Text style={s.cancelText}>CANCELAR</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.modalBtn, s.confirmBtn]} 
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#082f49" />
              ) : (
                <Text style={s.confirmText}>AUTORIZAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#18181b', padding: 25, borderRadius: 24, width: '85%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  modalSub: { color: '#71717a', fontSize: 13, marginBottom: 20, textAlign: 'center', lineHeight: 18 },
  modalInput: { backgroundColor: '#09090b', color: '#fff', width: '100%', padding: 18, borderRadius: 16, textAlign: 'center', fontSize: 24, fontWeight: 'bold', marginBottom: 20, borderWidth: 1, borderColor: '#38bdf8' },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#27272a' },
  confirmBtn: { backgroundColor: '#38bdf8' },
  cancelText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 12 },
  confirmText: { color: '#082f49', fontWeight: '900', fontSize: 12 }
});