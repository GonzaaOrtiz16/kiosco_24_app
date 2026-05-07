import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────
// NATIVO (Android APK / iOS): usa expo-camera
// ─────────────────────────────────────────────────────
let CameraView, useCameraPermissions;
if (Platform.OS !== 'web') {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  useCameraPermissions = ExpoCamera.useCameraPermissions;
}

// ─────────────────────────────────────────────────────
// WEB: usa @zxing/library
// ─────────────────────────────────────────────────────
let BrowserMultiFormatReader, DecodeHintType, BarcodeFormat;
if (Platform.OS === 'web') {
  const ZXing = require('@zxing/library');
  BrowserMultiFormatReader = ZXing.BrowserMultiFormatReader;
  DecodeHintType = ZXing.DecodeHintType;
  BarcodeFormat = ZXing.BarcodeFormat;
}

export default function ScannerHibrido({ onScan }) {
  if (Platform.OS === 'web') {
    return <ScannerWeb onScan={onScan} />;
  }
  return <ScannerNativo onScan={onScan} />;
}

// ─────────────────────────────────────────────────────
// ScannerWeb — CORREGIDO PARA EVITAR "not a function"
// ─────────────────────────────────────────────────────
function ScannerWeb({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState(null);
  const [camLabel, setCamLabel] = useState('Iniciando cámara...');

  useEffect(() => {
    let codeReader = null;

    const initScanner = async () => {
      // 1. Esperar un poco a que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!videoRef.current) return;

      try {
        // 2. FORZAR PERMISO antes de listar dispositivos (Soluciona error en iPhone)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        codeReader = new BrowserMultiFormatReader(hints);
        readerRef.current = codeReader;

        // 3. VALIDACIÓN DE SEGURIDAD: Chequear si la función existe antes de llamarla
        if (typeof codeReader.listVideoInputDevices !== 'function') {
           throw new Error("La librería de escaneo no cargó correctamente.");
        }

        const devices = await codeReader.listVideoInputDevices();
        let deviceId = undefined;

        if (devices && devices.length > 0) {
          const backCam = devices.find(d => /back|rear|trasera|environment|principal/i.test(d.label));
          deviceId = backCam ? backCam.deviceId : devices[devices.length - 1].deviceId;
          setCamLabel(backCam ? 'Cámara trasera activa' : 'Cámara activa');
        }

        await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            if (result && !scannedRef.current) {
              scannedRef.current = true;
              onScan(result.getText());
              setTimeout(() => { scannedRef.current = false; }, 2500);
            }
          }
        );
      } catch (e) {
        console.error("Error Scanner:", e);
        setError(e.name === 'NotAllowedError' ? 'Habilitá la cámara en los ajustes del navegador.' : e.message);
      }
    };

    initScanner();

    return () => {
      if (codeReader) {
        try { codeReader.reset(); } catch (_) {}
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={() => window.location.reload()}>
          <Text style={styles.btnText}>REINTENTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay playsInline muted
      />
      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} /><View style={styles.cornerTR} />
          <View style={styles.cornerBL} /><View style={styles.cornerBR} />
          <View style={styles.scanLine} />
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.textInfo}>Centrá el código de barras</Text>
          <Text style={styles.textCamLabel}>{camLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ScannerNativo (Sin cambios, es estable)
// ─────────────────────────────────────────────────────
function ScannerNativo({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Necesitamos permiso de cámara.</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR</Text>
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
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} /><View style={styles.cornerTR} />
          <View style={styles.cornerBL} /><View style={styles.cornerBR} />
          <View style={scanned ? styles.scanLineSuccess : styles.scanLine} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'white', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  btnPermiso: { backgroundColor: '#38bdf8', padding: 15, borderRadius: 10 },
  btnText: { fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  marker: { width: 280, height: 180, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#38bdf8' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#38bdf8' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#38bdf8' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#38bdf8' },
  scanLine: { width: '100%', height: 2, backgroundColor: '#38bdf8', opacity: 0.5 },
  scanLineSuccess: { width: '100%', height: 2, backgroundColor: '#4ade80' },
  infoBox: { marginTop: 20, alignItems: 'center' },
  textInfo: { color: 'white', fontSize: 13 },
  textCamLabel: { color: '#38bdf8', fontSize: 10, marginTop: 5 }
});
