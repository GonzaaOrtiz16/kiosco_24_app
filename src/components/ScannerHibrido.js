import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Para Android
import BarcodeScannerComponent from "react-qr-barcode-scanner"; // Para Web/Vercel

export default function ScannerHibrido({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // --- LÓGICA PARA WEB (Vercel) ---
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <BarcodeScannerComponent
          width="100%"
          height={300}
          onUpdate={(err, result) => {
            if (result) {
              onScan(result.text);
              alert("Escaneado en Web: " + result.text);
            }
          }}
        />
        <Text style={styles.textWeb}>Modo Web: Apuntá al código</Text>
      </View>
    );
  }

  // --- LÓGICA PARA APP (Android) ---
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Sin permiso de cámara</Text>
        <Button onPress={requestPermission} title="Dar permiso" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : ({ data }) => {
          setScanned(true);
          onScan(data);
          setTimeout(() => setScanned(false), 2000); // Re-activa en 2 seg
        }}
      />
      <View style={styles.overlay}>
        <Text style={styles.textApp}>Escaneando en App...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: 300, backgroundColor: 'black' },
  webContainer: { width: '100%', height: 300, backgroundColor: '#111' },
  overlay: { position: 'absolute', bottom: 20, width: '100%', alignItems: 'center' },
  textWeb: { color: 'white', textAlign: 'center', padding: 10 },
  textApp: { color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 5 }
});