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
// WEB: usa @zxing/library sobre un elemento <video>
// ─────────────────────────────────────────────────────
let BrowserMultiFormatReader, DecodeHintType, BarcodeFormat;
if (Platform.OS === 'web') {
  const ZXing = require('@zxing/library');
  BrowserMultiFormatReader = ZXing.BrowserMultiFormatReader;
  DecodeHintType = ZXing.DecodeHintType;
  BarcodeFormat = ZXing.BarcodeFormat;
}

// ─────────────────────────────────────────────────────
// Componente raíz — delega según plataforma
// ─────────────────────────────────────────────────────
export default function ScannerHibrido({ onScan }) {
  if (Platform.OS === 'web') {
    return <ScannerWeb onScan={onScan} />;
  }
  return <ScannerNativo onScan={onScan} />;
}

// ─────────────────────────────────────────────────────
// ScannerWeb — Chrome Android / Safari iOS / Chrome iOS
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
      // 1. Delay para que el DOM monte el elemento <video>
      await new Promise(r => setTimeout(r, 400));
      
      if (!videoRef.current) {
        setError('No se pudo inicializar la cámara. Recargá la página.');
        return;
      }

      try {
        // 2. FORZAR PERMISO: Vital para que iPhone no bloquee la lista de cámaras
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        }

        // 3. CONFIGURACIÓN ESTRICTA: Solo códigos de barras para no sobrecargar el CPU
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        codeReader = new BrowserMultiFormatReader(hints);
        readerRef.current = codeReader;

        // 4. LISTAR CÁMARAS: Se llama sobre la instancia, no estático (evita error "not a function")
        const devices = await codeReader.listVideoInputDevices();
        let deviceId = undefined;

        if (devices && devices.length > 0) {
          const backCam = devices.find(d => /back|rear|trasera|environment|principal/i.test(d.label));
          if (backCam) {
            deviceId = backCam.deviceId;
            setCamLabel('Cámara trasera activa');
          } else {
            deviceId = devices[devices.length - 1].deviceId;
            setCamLabel('Cámara activa');
          }
        }

        // 5. INICIAR ESCANEO
        await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            if (result && !scannedRef.current) {
              const text = result.getText();
              
              // 6. VALIDACIÓN ESTRICTA: Ignorar ruidos. Solo acepta entre 8 y 14 números.
              if (/^\d{8,14}$/.test(text)) {
                scannedRef.current = true;
                setCamLabel('¡PRODUCTO LEÍDO!');
                onScan(text);
                
                // Pausa para evitar lecturas dobles
                setTimeout(() => { 
                  scannedRef.current = false; 
                  setCamLabel('Escaneando...');
                }, 2500);
              }
            }
          }
        );
      } catch (e) {
        console.error("Scanner Error:", e);
        setError('Error de cámara o permiso denegado. Verificá los ajustes.');
      }
    };

    startScanner();

    return () => {
      // Cleanup seguro
      if (codeReader) {
        try { codeReader.reset(); } catch (_) {}
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.btnPermiso}
          onPress={() => {
            setError(null);
            window.location.reload();
          }}
        >
          <Text style={styles.btnText}>REINTENTAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        autoPlay
        playsInline
        muted
      />

      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <View style={styles.scanLine} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.textInfo}>
            Centrá el código de barras en el recuadro
          </Text>
          <Text style={styles.textCamLabel}>{camLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// ScannerNativo — Android APK / iOS App
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
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Iniciando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorText}>
          Necesitamos permiso para usar la cámara del celular.
        </Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || !data) return;
    
    // Aplicamos el mismo filtro estricto al nativo
    if (/^\d{8,14}$/.test(data)) {
      setScanned(true);
      onScan(data);
      setTimeout(() => setScanned(false), 2500);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.marker}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          {scanned
            ? <View style={styles.scanLineSuccess} />
            : <View style={styles.scanLine} />
          }
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.textInfo}>
            Centrá el código de barras en el recuadro
          </Text>
          {scanned && (
            <Text style={styles.textSuccess}>¡PRODUCTO LEÍDO!</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// Estilos compartidos
// ─────────────────────────────────────────────────────
const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;
const CORNER_COLOR = '#38bdf8';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCenter: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 15,
    paddingHorizontal: 30,
    lineHeight: 22,
    marginBottom: 20,
  },
  btnPermiso: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
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
    width: 280,
    height: 140, // Reducido ligeramente para forzar al usuario a centrar mejor el código
    borderRadius: 4,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  cornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderBottomRightRadius: 4,
  },

  scanLine: {
    width: '85%',
    height: 2,
    backgroundColor: '#38bdf8',
    opacity: 0.8,
  },
  scanLineSuccess: {
    width: '85%',
    height: 2,
    backgroundColor: '#4ade80',
  },

  infoBox: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  textInfo: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  textCamLabel: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  textSuccess: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});