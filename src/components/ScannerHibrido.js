import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';

// --- NATIVO: usa expo-camera ---
import { CameraView, useCameraPermissions } from 'expo-camera';

// --- WEB: usa ZXing sobre un elemento <video> ---
let BrowserMultiFormatReader;
if (Platform.OS === 'web') {
  // Import dinámico para que no rompa el bundle nativo
  BrowserMultiFormatReader = require('@zxing/library').BrowserMultiFormatReader;
}

export default function ScannerHibrido({ onScan }) {
  // ── WEB ─────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return <ScannerWeb onScan={onScan} />;
  }

  // ── NATIVO ──────────────────────────────────────────
  return <ScannerNativo onScan={onScan} />;
}

// ─────────────────────────────────────────────────────
// Componente WEB (ZXing + <video>)
// ─────────────────────────────────────────────────────
function ScannerWeb({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result && !scannedRef.current) {
        scannedRef.current = true;
        onScan(result.getText());
        // Pausa anti-doble lectura
        setTimeout(() => { scannedRef.current = false; }, 2500);
      }
      // err es normal cuando no hay barcode en el frame, no lo mostramos
    }).catch(e => {
      setError('No se pudo acceder a la cámara: ' + e.message);
    });

    return () => {
      // Cleanup: detener la cámara al desmontar
      codeReader.reset();
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay
        playsInline
        muted
      />
      <View style={styles.overlay}>
        <View style={styles.marker} />
        <Text style={styles.textInfo}>Centrá el código de barras en el recuadro</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// Componente NATIVO (expo-camera, sin cambios)
// ─────────────────────────────────────────────────────
function ScannerNativo({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.textCenter}>Iniciando cámara...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Necesitamos permiso para usar la cámara.</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || !data) return;
    setScanned(true);
    onScan(data);
    setTimeout(() => setScanned(false), 2500);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.marker}>
          {scanned && <View style={styles.lineScanActive} />}
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.textInfo}>Centrá el código de barras en el recuadro</Text>
          {scanned && <Text style={styles.textSuccess}>¡PRODUCTO LEÍDO!</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  textCenter: { color: 'white', textAlign: 'center', fontSize: 16 },
  btnPermiso: { backgroundColor: '#38bdf8', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 12, marginTop: 10 },
  btnText: { color: '#000', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  marker: { width: 280, height: 180, borderWidth: 2, borderColor: '#38bdf8', borderRadius: 20, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  lineScanActive: { width: '90%', height: 2, backgroundColor: '#4ade80' },
  infoBox: { marginTop: 40, alignItems: 'center' },
  textInfo: { color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, fontSize: 14, fontWeight: 'bold' },
  textSuccess: { color: '#4ade80', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
});