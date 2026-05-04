import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
// Importamos la función para obtener perfiles de Supabase
import { getSellerProfiles } from '../lib/supabase';

export default function LoginScreen({ onLogin }) {
  const [profiles, setProfiles] = useState([]); // Reemplaza a MOCK_USERS
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  // Cargamos los perfiles reales al iniciar
  useEffect(() => {
    async function loadProfiles() {
      try {
        const data = await getSellerProfiles();
        setProfiles(data || []);
      } catch (error) {
        setErr('Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    }
    loadProfiles();
  }, []);

  const handlePin = (d) => { if (pin.length < 4) setPin(p => p + d); };
  const handleDel = () => setPin(p => p.slice(0, -1));
  
  const handleLogin = () => {
    // Comparamos contra el PIN del perfil traído de la DB
    if (pin === selected.pin) { 
      onLogin(selected); 
    } else { 
      setErr('PIN incorrecto'); 
      setPin(''); 
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.container}>
        
        <View style={s.header}>
          <Text style={s.logo}>Kiosco <Text style={s.blue}>24hs</Text></Text>
          <Text style={s.sub}>SISTEMA DE GESTIÓN</Text>
        </View>

        {!selected ? (
          <View style={s.users}>
            <Text style={s.label}>Seleccioná tu perfil</Text>
            {profiles.length === 0 && <Text style={s.err}>No hay perfiles configurados</Text>}
            {profiles.map(u => (
              <TouchableOpacity 
                key={u.id} 
                style={s.userBtn} 
                onPress={() => { setSelected(u); setErr(''); setPin(''); }}
                activeOpacity={0.7}
              >
                <View style={s.userRow}>
                  <View>
                    <Text style={s.userName}>{u.full_name}</Text>
                    <Text style={[s.role, u.role === 'encargado' ? s.roleBlue : s.roleGray]}>
                      {u.role.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.arrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.pinBox}>
            <View style={s.pinHeader}>
              <Text style={s.userTitle}>Hola, {selected.full_name.split(' ')[0]}</Text>
              <TouchableOpacity onPress={() => { setSelected(null); setPin(''); setErr(''); }}>
                <Text style={s.back}>Volver ✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={s.dots}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />
              ))}
            </View>

            {!!err && <Text style={s.err}>{err}</Text>}

            <View style={s.numpad}>
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[s.key, k === '' && s.keyEmpty]}
                  onPress={() => k === '⌫' ? handleDel() : k !== '' ? handlePin(String(k)) : null}
                  activeOpacity={0.5}
                >
                  <Text style={s.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[s.loginBtn, pin.length < 4 && s.loginBtnDis]} 
              onPress={handleLogin} 
              disabled={pin.length < 4}
            >
              <Text style={s.loginBtnText}>INGRESAR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#18181b' }, 
  container: { flex: 1, padding: 32, justifyContent: 'center' },
  header: { marginBottom: 48, alignItems: 'center' },
  logo: { fontSize: 32, fontWeight: '200', color: '#f4f4f5', letterSpacing: -1 },
  blue: { color: '#38bdf8', fontWeight: '600' },
  sub: { color: '#71717a', fontSize: 10, letterSpacing: 3, marginTop: 8, fontWeight: '400' },
  label: { color: '#52525b', fontSize: 11, textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 },
  users: { gap: 12 },
  userBtn: { backgroundColor: '#27272a', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#3f3f46' },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { color: '#fafafa', fontWeight: '500', fontSize: 16 },
  role: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  roleBlue: { color: '#38bdf8' },
  roleGray: { color: '#71717a' },
  arrow: { color: '#52525b', fontSize: 16 },
  pinBox: { backgroundColor: '#27272a', borderRadius: 16, padding: 28, gap: 32, borderWidth: 1, borderColor: '#3f3f46' },
  pinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userTitle: { color: '#f4f4f5', fontSize: 15, fontWeight: '400' },
  back: { color: '#71717a', fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  dot: { width: 12, height: 12, borderRadius: 2, borderWidth: 1, borderColor: '#52525b' },
  dotFilled: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  err: { color: '#f87171', textAlign: 'center', fontSize: 12, fontWeight: '500' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  key: { width: '30%', height: 54, backgroundColor: '#18181b', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  keyEmpty: { backgroundColor: 'transparent', borderWidth: 0 },
  keyText: { color: '#d4d4d8', fontSize: 22, fontWeight: '300' },
  loginBtn: { backgroundColor: '#38bdf8', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  loginBtnDis: { backgroundColor: '#3f3f46', opacity: 0.5 },
  loginBtnText: { color: '#082f49', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
});