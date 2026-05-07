import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────
// NATIVO (Android APK / iOS App): usa expo-camera
// ─────────────────────────────────────────────────────
let CameraView, useCameraPermissions;
if (Platform.OS !== 'web') {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  useCameraPermissions = ExpoCamera.useCameraPermissions;
}

// ─────────────────────────────────────────────────────
// WEB: usa @zxing/library sobre un elemento <video>
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
// COMPONENTE WEB (Optimizado para iPhone 15 y Android Chrome)
// ─────────────────────────────────────────────────────
function ScannerWeb({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState(null);
  const [camLabel, setCamLabel] = useState('Buscando cámara trasera...');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!videoRef.current) return;

      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        readerRef.current = codeReader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        let deviceId = undefined;

        if (devices && devices.length > 0) {
          // Buscamos la cámara trasera con un filtro más amplio
          const backCam = devices.find(d => 
            /back|rear|trasera|environment|principal|0/i.test(d.label)
          );
          
          // En iPhone 15, a veces la última cámara de la lista es la de enfoque cercano (macro)
          // Si backCam existe usamos esa, sino la última.
          deviceId = backCam ? backCam.deviceId : devices[devices.length - 1].deviceId;
          setCamLabel(backCam ? 'Cámara trasera activa' : 'Cámara activa');
        }

        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            
            // Sonido de sistema para feedback (opcional)
            onScan(result.getText());
            
            // Pausa para evitar lecturas duplicadas
            setTimeout(() => { scannedRef.current = false; }, 3000);
          }
        });
      } catch (e) {
        setError('Error de cámara: ' + e.message);
      }
    }, 400); // Aumentamos un poco el delay para asegurar que el DOM esté listo

    return () => {
      clearTimeout(timer);
      if (readerRef.current) {
        try {
          readerRef.current.reset();
          readerRef.current.stopContinuousDecode();
        } catch (e) {
          console.log("Limpieza de cámara");
        }
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={() => window.location.reload()}>
          <Text style={styles.btnText}>REINTENTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video
        key={camLabel} // FUERZA RE-RENDER AL DETECTAR CÁMARA
        ref={videoRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          position: 'absolute' 
        }}
        autoPlay
        playsInline
        muted
        webkit-playsinline="true"
      />
      
      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} /><View style={styles.cornerTR} />
          <View style={styles.cornerBL} /><View style={styles.cornerBR} />
          <View style={styles.scanLine} />
        </View>
        
        <View style={styles.infoBox}>
          {/* CAMBIÉ EL TEXTO PARA QUE CONFIRMES SI VERCEL ACTUALIZÓ */}
          <Text style={styles.textInfo}>MODO SCANNER V2.1</Text>
          <Text style={styles.textCamLabel}>{camLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// COMPONENTE NATIVO (Para el APK)
// ─────────────────────────────────────────────────────
function ScannerNativo({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Necesitamos permiso de cámara</Text>
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
          barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} /><View style={styles.cornerTR} />
          <View style={styles.cornerBL} /><View style={styles.cornerBR} />
          <View style={scanned ? styles.scanLineSuccess : styles.scanLine} />
        </View>
        <Text style={styles.textInfo}>MODO APP: ESCANEANDO...</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'white', textAlign: 'center', marginBottom: 20, padding: 20 },
  btnPermiso: { backgroundColor: '#38bdf8', padding: 15, borderRadius: 12 },
  btnText: { color: '#000', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  marker: { width: 280, height: 180, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#38bdf8' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#38bdf8' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#38bdf8' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#38bdf8' },
  scanLine: { width: '90%', height: 2, backgroundColor: '#38bdf8' },
  scanLineSuccess: { width: '90%', height: 2, backgroundColor: '#4ade80' },
  infoBox: { marginTop: 30, alignItems: 'center' },
  textInfo: { color: 'white', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, fontSize: 14 },
  textCamLabel: { color: '#38bdf8', fontSize: 12, marginTop: 5, fontWeight: 'bold' }
});