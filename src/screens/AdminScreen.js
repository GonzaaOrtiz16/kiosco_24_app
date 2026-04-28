import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
// Importamos las funciones que agregamos recién a supabase.js
import { createSellerProfile, updateMyPin } from '../lib/supabase';

export default function AdminScreen({ user, onBack }) {
  const [loading, setLoading] = useState(false);
  
  // Estados para crear un nuevo vendedor
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('vendedor');
  const [newPin, setNewPin] = useState('');

  // Estado para que el usuario actual cambie su PIN
  const [myNewPin, setMyNewPin] = useState('');

  // Función para crear un perfil nuevo (Solo para el encargado)
  const handleCreateProfile = async () => {
    if (!newName || !newPin) return Alert.alert('Error', 'Completá nombre y PIN inicial');
    if (newPin.length !== 4) return Alert.alert('Error', 'El PIN debe ser de exactamente 4 números');

    try {
      setLoading(true);
      await createSellerProfile(newName, newRole, newPin);
      Alert.alert('✓ Registrado', `El perfil de ${newName} fue creado.`);
      setNewName('');
      setNewPin('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el perfil. Revisá la conexión.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar el PIN propio
  const handleChangeMyPin = async () => {
    if (myNewPin.length !== 4) return Alert.alert('Error', 'El nuevo PIN debe tener 4 dígitos');

    try {
      setLoading(true);
      await updateMyPin(user.id, myNewPin);
      Alert.alert('✓ Éxito', 'Tu PIN de acceso ha sido actualizado correctamente.');
      setMyNewPin('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar tu PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← VOLVER AL POS</Text>
        </TouchableOpacity>

        <Text style={s.headerTitle}>CONFIGURACIÓN</Text>

        {/* SECCIÓN 1: CAMBIAR MI PIN (Disponible para todos) */}
        <View style={s.card}>
          <Text style={s.cardTitle}>MI SEGURIDAD</Text>
          <Text style={s.label}>Establecer nuevo PIN de acceso</Text>
          <TextInput
            style={s.input}
            placeholder="4 dígitos nuevos"
            placeholderTextColor="#52525b"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={myNewPin}
            onChangeText={setMyNewPin}
          />
          <TouchableOpacity 
            style={[s.primaryBtn, { backgroundColor: '#3f3f46' }]} 
            onPress={handleChangeMyPin}
            disabled={loading}
          >
            <Text style={s.btnText}>ACTUALIZAR MI PIN</Text>
          </TouchableOpacity>
        </View>

        {/* SECCIÓN 2: ADMINISTRACIÓN (Solo visible si el usuario es encargado) */}
        {user?.role === 'encargado' && (
          <View style={[s.card, { marginTop: 24, borderColor: '#f9731633' }]}>
            <Text style={[s.cardTitle, { color: '#f97316' }]}>GESTIÓN DE EQUIPO</Text>
            
            <Text style={s.label}>Nombre del nuevo usuario</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: Gonzalo"
              placeholderTextColor="#52525b"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={s.label}>Rol en el negocio</Text>
            <View style={s.roleRow}>
              {['vendedor', 'encargado'].map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[s.roleOption, newRole === r && s.roleActive]} 
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[s.roleText, newRole === r && s.roleTextActive]}>
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>PIN Inicial de acceso</Text>
            <TextInput
              style={s.input}
              placeholder="4 números"
              placeholderTextColor="#52525b"
              keyboardType="numeric"
              maxLength={4}
              value={newPin}
              onChangeText={setNewPin}
            />

            <TouchableOpacity 
              style={[s.primaryBtn, { backgroundColor: '#22c55e' }]} 
              onPress={handleCreateProfile} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>CREAR CUENTA NUEVA</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  scroll: { paddingHorizontal: 20 },
  backBtn: { marginTop: 20, marginBottom: 10 },
  backBtnText: { color: '#71717a', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 25 },
  card: { backgroundColor: '#18181b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#27272a' },
  cardTitle: { color: '#71717a', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
  label: { color: '#a1a1aa', fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#09090b', color: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#27272a', fontWeight: 'bold' },
  primaryBtn: { borderRadius: 16, padding: 18, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleOption: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', alignItems: 'center' },
  roleActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  roleText: { color: '#71717a', fontWeight: 'bold', fontSize: 11 },
  roleTextActive: { color: '#fff' },
});