import React, { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

const ScannerInput = forwardRef(({ 
  value, 
  onChangeText, 
  onCameraPress, 
  isFocusedMode, 
  scanning 
}, ref) => {
  
  return (
    <View style={s.container}>
      <View style={s.subHeader}>
        <Text style={s.label}>BUSCADOR</Text>
        <TouchableOpacity onPress={onCameraPress} style={s.miniCamBtn}>
          <Text style={s.miniCamText}>📷 CÁMARA</Text>
        </TouchableOpacity>
      </View>

      <TextInput 
        ref={ref}
        style={s.input} 
        placeholder="Escanee o busque producto..." 
        placeholderTextColor="#52525b"
        value={value} 
        onChangeText={onChangeText} 
        // Si pierde el foco y no estamos usando la cámara, lo recupera
        onBlur={() => {
          if (isFocusedMode && !scanning) {
            setTimeout(() => ref.current?.focus(), 100);
          }
        }}
        // Importante para PC: que no oculte el teclado virtual si no es necesario, 
        // pero permite escribir normalmente.
        showSoftInputOnFocus={true} 
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    marginTop: 15,
    marginBottom: 8,
  },
  subHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  label: { 
    color: '#71717a', 
    fontSize: 10, 
    fontWeight: '900', 
    backgroundColor: '#18181b', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  miniCamBtn: { 
    backgroundColor: '#38bdf8', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  miniCamText: { 
    color: '#082f49', 
    fontSize: 10, 
    fontWeight: '900' 
  },
  input: { 
    backgroundColor: '#18181b', 
    color: '#fff', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: '#38bdf8' 
  },
});

export default ScannerInput;