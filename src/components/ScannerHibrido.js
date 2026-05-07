import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';

// ─────────────────────────────────────────────────────
// NATIVO (Android APK / iOS): usa expo-camera
// ─────────────────────────────────────────────────────
// El import de expo-camera se hace de forma condicional para que
// no rompa el bundle web, donde estos módulos no existen.
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
    // Esperamos 150ms para garantizar que el <video> ya está montado en el DOM.
    // Sin este delay, videoRef.current es null y ZXing falla silenciosamente.
    const timer = setTimeout(async () => {
      if (!videoRef.current) {
        setError('No se pudo inicializar la cámara. Recargá la página.');
        return;
      }

      try {
        // Configuración de hints: formatos a detectar y modo "try harder"
        // que hace más intentos por frame (crítico para EAN-13 en móvil)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints);
        readerRef.current = codeReader;

        // Enumerar dispositivos para elegir explícitamente la cámara trasera.
        // Con null como deviceId el browser elige (casi siempre la frontal en móvil).
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();

        let deviceId = undefined;
        if (devices && devices.length > 0) {
          // Buscar por label: "back", "rear", "trasera", "environment"
          const backCam = devices.find(d =>
            /back|rear|trasera|environment|principal/i.test(d.label)
          );
          if (backCam) {
            deviceId = backCam.deviceId;
            setCamLabel('Cámara trasera activa');
          } else {
            // Fallback: en móvil el último dispositivo suele ser la trasera
            deviceId = devices[devices.length - 1].deviceId;
            setCamLabel('Cámara activa');
          }
        }

        await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, err) => {
            // err llega en cada frame sin código — es normal, no lo mostramos
            if (result && !scannedRef.current) {
              scannedRef.current = true;
              onScan(result.getText());
              // Pausa de 2.5s para evitar doble lectura del mismo código
              setTimeout(() => { scannedRef.current = false; }, 2500);
            }
          }
        );
      } catch (e) {
        // Errores comunes:
        // - NotAllowedError: usuario denegó permiso de cámara
        // - NotFoundError: no hay cámara disponible
        // - OverconstrainedError: el deviceId elegido no existe
        const msg = e?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilitalo en la configuración del navegador.'
          : e?.name === 'NotFoundError'
          ? 'No se encontró ninguna cámara en este dispositivo.'
          : 'Error de cámara: ' + e.message;
        setError(msg);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      // Cleanup: liberar el stream de video al desmontar el componente
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch (_) {}
      }
    };
  }, []); // Solo corre al montar — no necesita deps

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.btnPermiso}
          onPress={() => {
            setError(null);
            // Forzar recarga del componente
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
      {/*
        El elemento <video> es HTML nativo — React Native Web lo permite.
        autoPlay + playsInline + muted son OBLIGATORIOS en iOS Safari
        para que el video arranque sin interacción del usuario.
      */}
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

      {/* Overlay con guía visual */}
      <View style={styles.overlay}>
        {/* Marco guía */}
        <View style={styles.marker}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          {/* Línea de escaneo animada */}
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

  // Pedir permisos al montar
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Cargando permisos
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Iniciando cámara...</Text>
      </View>
    );
  }

  // Permiso denegado
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
    setScanned(true);
    onScan(data);
    setTimeout(() => setScanned(false), 2500);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        // facing="back" fuerza la cámara trasera en el APK
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
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

  // Overlay y marco
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
    height: 180,
    borderRadius: 4,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // Esquinas del marco (estilo moderno, sin borde completo)
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

  // Línea de escaneo
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

  // Texto inferior
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