import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function BarcodeScanner({ onScan, onClose }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  if (hasPermission === null) return (
    <View style={s.container}>
      <Text style={s.text}>Solicitando permiso de cámara...</Text>
    </View>
  );

  if (hasPermission === false) return (
    <View style={s.container}>
      <Text style={s.error}>Sin acceso a la cámara.</Text>
      <Text style={s.sub}>Andá a Ajustes → Permisos → Cámara</Text>
      <TouchableOpacity style={s.btn} onPress={onClose}>
        <Text style={s.btnText}>CERRAR</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <CameraView
        style={s.camera}
        facing="back"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr","ean13","ean8","code128","code39","upc_a","upc_e","itf14","datamatrix","aztec","pdf417"] }}
      />
      <View style={s.overlay}>
        <View style={s.frame} />
        <Text style={s.hint}>Apuntá al código QR o de barras</Text>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.btnText}>CANCELAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%' },
  frame: { width: 260, height: 160, borderWidth: 2, borderColor: '#f97316', borderRadius: 16 },
  hint: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  text: { color: '#fff', fontSize: 14 },
  error: { color: '#f87171', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  sub: { color: '#71717a', fontSize: 12, marginTop: 8, textAlign: 'center' },
  btn: { backgroundColor: '#27272a', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 16 },
  closeBtn: { backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
  btnText: { color: '#fff', fontWeight: 'black', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
});