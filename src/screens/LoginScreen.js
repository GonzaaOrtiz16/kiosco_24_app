import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { MOCK_USERS } from '../data/mock';

export default function LoginScreen({ onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const handlePin = (d) => { if (pin.length < 4) setPin(p => p + d); };
  const handleDel = () => setPin(p => p.slice(0, -1));
  const handleLogin = () => {
    if (pin === selected.pin) { onLogin(selected); }
    else { setErr('PIN incorrecto'); setPin(''); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.logo}><Text style={s.orange}>Rafaghelli</Text> POS</Text>
        <Text style={s.sub}>SISTEMA DE VENTAS</Text>

        {!selected ? (
          <View style={s.users}>
            <Text style={s.label}>Seleccioná tu usuario</Text>
            {MOCK_USERS.map(u => (
              <TouchableOpacity key={u.id} style={s.userBtn} onPress={() => { setSelected(u); setErr(''); setPin(''); }}>
                <View>
                  <Text style={s.userName}>{u.name}</Text>
                  <Text style={[s.role, u.role === 'encargado' ? s.roleOrange : s.roleGray]}>{u.role.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={s.pinBox}>
            <View style={s.pinHeader}>
              <Text style={s.userName}>{selected.name}</Text>
              <TouchableOpacity onPress={() => { setSelected(null); setPin(''); setErr(''); }}>
                <Text style={s.back}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.dots}>
              {[0,1,2,3].map(i => <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />)}
            </View>
            {!!err && <Text style={s.err}>{err}</Text>}
            <View style={s.numpad}>
              {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
                <TouchableOpacity key={i} style={[s.key, k === '' && s.keyEmpty]}
                  onPress={() => k === '⌫' ? handleDel() : k !== '' ? handlePin(String(k)) : null}>
                  <Text style={s.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.loginBtn, pin.length < 4 && s.loginBtnDis]} onPress={handleLogin} disabled={pin.length < 4}>
              <Text style={s.loginBtnText}>INGRESAR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 8 },
  logo: { fontSize: 36, fontWeight: '900', color: '#fff', textAlign: 'center', fontStyle: 'italic' },
  orange: { color: '#f97316' },
  sub: { color: '#52525b', fontSize: 11, textAlign: 'center', letterSpacing: 3, marginBottom: 24 },
  label: { color: '#71717a', fontSize: 11, textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
  users: { gap: 12 },
  userBtn: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 18 },
  userName: { color: '#fff', fontWeight: '900', fontSize: 15 },
  role: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  roleOrange: { color: '#f97316' },
  roleGray: { color: '#71717a' },
  pinBox: { backgroundColor: '#18181b', borderRadius: 28, padding: 24, gap: 20, borderWidth: 1, borderColor: '#27272a' },
  pinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#52525b', fontSize: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#52525b' },
  dotFilled: { backgroundColor: '#f97316', borderColor: '#f97316' },
  err: { color: '#f87171', textAlign: 'center', fontSize: 12, fontWeight: 'bold' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  key: { width: '30%', height: 56, backgroundColor: '#27272a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  loginBtn: { backgroundColor: '#f97316', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  loginBtnDis: { opacity: 0.4 },
  loginBtnText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
});