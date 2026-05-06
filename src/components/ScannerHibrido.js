import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerHibrido({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Solicitar permisos automáticamente al abrir
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // Estado de carga de permisos
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Cargando cámara...</Text>
      </View>
    );
  }

  // Si no hay permisos concedidos
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>No tenemos acceso a la cámara</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>DAR PERMISO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    // Reinicia el escáner después de 2.5 segundos para evitar lecturas duplicadas
    setTimeout(() => setScanned(false), 2500);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "qr"], // Tipos de códigos de productos
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Overlay visual para centrar el código */}
      <View style={styles.overlay}>
        <View style={styles.marker} />
        <Text style={styles.textInfo}>
          {Platform.OS === 'web' 
            ? 'Cámara Web Activa - Apuntá al código' 
            : 'Escaneando con el celular...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  textCenter: { 
    color: 'white', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  btnPermiso: { 
    backgroundColor: '#38bdf8', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  btnText: { 
    color: '#000', 
    fontWeight: 'bold' 
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 15,
    backgroundColor: 'transparent',
  },
  textInfo: {
    color: 'white',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden'
  }
});