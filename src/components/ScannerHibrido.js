import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerHibrido({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Pedir permisos apenas se abre el componente
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  // Pantalla de carga mientras se verifican permisos
  if (!permission) {
    return <View style={styles.container}><Text style={styles.textCenter}>Iniciando cámara...</Text></View>;
  }

  // Si no hay permisos (por ejemplo, si se rechazó el cartel del navegador o del sistema)
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>Necesitamos tu permiso para usar la cámara del celular.</Text>
        <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
          <Text style={styles.btnText}>HABILITAR CÁMARA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Función que se dispara al detectar un código
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || !data) return;
    setScanned(true);
    
    // Enviamos el código al POS o al Stock
    onScan(data);

    // Pausa de 2.5 segundos para que no escanee el mismo producto dos veces seguidas
    setTimeout(() => setScanned(false), 2500);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        // Configuración crítica para que escanee rápido en Android/iOS
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",   // Código de barras estándar de productos (el más importante)
            "ean8",    // Productos chicos
            "upc_a",   // Productos importados
            "code128", // Etiquetas de envío
            "qr"       // Códigos QR
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Interfaz del Escáner */}
      <View style={styles.overlay}>
        {/* El recuadro guía */}
        <View style={styles.marker}>
            {scanned && <View style={styles.lineScanActive} />}
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  textCenter: { 
    color: 'white', 
    textAlign: 'center', 
    fontSize: 16 
  },
  btnPermiso: { 
    backgroundColor: '#38bdf8', 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 12,
    marginTop: 10 
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
    height: 180,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  lineScanActive: {
    width: '90%',
    height: 2,
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowRadius: 10,
    elevation: 5
  },
  infoBox: {
    marginTop: 40,
    alignItems: 'center'
  },
  textInfo: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 'bold'
  },
  textSuccess: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textTransform: 'uppercase'
  }
});