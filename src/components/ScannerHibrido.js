import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerHibrido({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Solicitar permisos al montar o si cambian
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Estado de carga inicial
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Cargando cámara...</Text>
      </View>
    );
  }

  // Si no hay permisos o fueron denegados
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Permiso de cámara necesario para escanear.</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Función que procesa la lectura
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || !data) return;
    setScanned(true);
    
    // Ejecutamos la función que viene por props
    onScan(data);

    // Esperamos 3 segundos antes de permitir otro escaneo 
    // para que no cargue el mismo producto 10 veces seguidas
    setTimeout(() => setScanned(false), 3000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          // Agregamos más formatos para que la web tenga más chances de reconocerlos
          barcodeTypes: [
            "ean13", 
            "ean8", 
            "upc_a", 
            "upc_e", 
            "code128", 
            "code39", 
            "qr"
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Marco de referencia visual */}
      <View style={styles.overlay}>
        <View style={styles.marker} />
        
        <View style={styles.infoContainer}>
          <Text style={styles.textInfo}>
            {Platform.OS === 'web' 
              ? 'Mantené el código firme frente a la webcam' 
              : 'Escaneando código...'}
          </Text>
          {scanned && (
            <Text style={styles.textScanned}>¡LEÍDO!</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black', 
    justifyContent: 'center', 
    alignItems: 'center',
    minHeight: 400 // Importante para que se vea bien en navegadores
  },
  textCenter: { 
    color: 'white', 
    textAlign: 'center', 
    padding: 20 
  },
  btnPermiso: { 
    backgroundColor: '#38bdf8', 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 12 
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
    width: 280,
    height: 160,
    borderWidth: 3,
    borderColor: '#38bdf8',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  infoContainer: {
    marginTop: 30,
    alignItems: 'center'
  },
  textInfo: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  textScanned: {
    color: '#4ade80',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    textShadowColor: 'black',
    textShadowRadius: 5
  }
});