import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────
// IMPORTACIONES CONDICIONALES
// ─────────────────────────────────────────────────────
let CameraView, useCameraPermissions;
if (Platform.OS !== 'web') {
  try {
    const ExpoCamera = require('expo-camera');
    CameraView = ExpoCamera.CameraView;
    useCameraPermissions = ExpoCamera.useCameraPermissions;
  } catch (e) { console.log("Expo Camera no disponible"); }
}

let BrowserMultiFormatReader, DecodeHintType, BarcodeFormat;
if (Platform.OS === 'web') {
  try {
    const ZXing = require('@zxing/library');
    BrowserMultiFormatReader = ZXing.BrowserMultiFormatReader;
    DecodeHintType = ZXing.DecodeHintType;
    BarcodeFormat = ZXing.BarcodeFormat;
  } catch (e) { console.log("ZXing no disponible"); }
}

export default function ScannerHibrido({ onScan }) {
  if (Platform.OS === 'web') return <ScannerWeb onScan={onScan} />;
  return <ScannerNativo onScan={onScan} />;
}

// ─────────────────────────────────────────────────────
// ScannerWeb — OPTIMIZADO PARA MÓVILES (Chrome/Safari)
// ─────────────────────────────────────────────────────
function ScannerWeb({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState(null);
  const [camLabel, setCamLabel] = useState('Iniciando cámara...');

  useEffect(() => {
    let codeReader = null;

    const startScanner = async () => {
      // 1. Pequeño delay para asegurar que el ref del video esté vinculado al DOM
      await new Promise(r => setTimeout(r, 500));
      if (!videoRef.current) return;

      try {
        // 2. PEDIR PERMISO EXPLÍCITO: Evita que la lista de cámaras vuelva vacía en iOS
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        codeReader = new BrowserMultiFormatReader(hints);
        readerRef.current = codeReader;

        const devices = await codeReader.listVideoInputDevices();
        let deviceId = undefined;

        if (devices && devices.length > 0) {
          // Buscamos la cámara trasera con filtros de texto más amplios
          const backCam = devices.find(d => /back|rear|trasera|environment|principal|facing/i.test(d.label));
          // En Samsung/iPhone, si no encuentra "back", el último suele ser el lente principal
          deviceId = backCam ? backCam.deviceId : devices[devices.length - 1].deviceId;
          setCamLabel(backCam ? 'Cámara trasera activa' : 'Escáner activo');
        }

        await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            if (result && !scannedRef.current) {
              const text = result.getText();
              // FILTRO: Solo números de 8 a 14 dígitos (EAN/UPC)
              if (/^\d{8,14}$/.test(text)) {
                scannedRef.current = true;
                setCamLabel('¡PRODUCTO LEÍDO!');
                onScan(text);
                setTimeout(() => { 
                  scannedRef.current = false; 
                  setCamLabel('Escaneando...');
                }, 2500);
              }
            }
          }
        );
      } catch (e) {
        console.error("Web Scanner Error:", e);
        setError('Error: Habilitá la cámara en los ajustes del navegador.');
      }
    };

    startScanner();
    return () => { if (codeReader) codeReader.reset(); };
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
        style={styles.videoWeb}
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
// ScannerNativo (Optimizado APK)
// ─────────────────────────────────────────────────────
function ScannerNativo({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128'] }}
        onBarcodeScanned={({ data }) => {
          if (scanned || !/^\d{8,14}$/.test(data)) return;
          setScanned(true);
          onScan(data);
          setTimeout(() => setScanned(false), 2500);
        }}
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
  videoWeb: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
  errorText: { color: 'white', textAlign: 'center', marginBottom: 20, paddingHorizontal: 30 },
  btnPermiso: { backgroundColor: '#38bdf8', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  btnText: { fontWeight: 'bold', color: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  marker: { width: 280, height: 160, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 22, height: 22, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#38bdf8' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#38bdf8' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 22, height: 22, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#38bdf8' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#38bdf8' },
  scanLine: { width: '100%', height: 2, backgroundColor: '#38bdf8', opacity: 0.7, position: 'absolute', top: '50%' },
  scanLineSuccess: { width: '100%', height: 2, backgroundColor: '#4ade80', position: 'absolute', top: '50%' },
  infoBox: { marginTop: 40, alignItems: 'center' },
  textInfo: { color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 10, fontSize: 13 },
  textCamLabel: { color: '#38bdf8', fontSize: 11, marginTop: 10, fontWeight: 'bold', textTransform: 'uppercase' }
});