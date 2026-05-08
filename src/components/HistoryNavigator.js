import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Recibe 'activeTab' como prop para saber qué botón resaltar
export default function HistoryNavigator({ onRangeChange, activeTab }) {
  
  const ranges = [
    { id: 'day', label: 'Hoy' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
  ];

  const handleRangeSelect = (rangeId) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    // Resetear horas para que el filtro sea exacto
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (rangeId) {
      case 'day':
        // Hoy ya está configurado por defecto
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }

    // Notificamos al padre el cambio de rango y el ID seleccionado
    onRangeChange(start, end, rangeId);
  };

  return (
    <View style={h.container}>
      <Text style={h.title}>VER HISTORIAL POR PERÍODO</Text>
      <View style={h.tabs}>
        {ranges.map((r) => (
          <TouchableOpacity
            key={r.id}
            // Comparamos con la prop 'activeTab' que viene del padre
            style={[h.tab, activeTab === r.id && h.tabActive]}
            onPress={() => handleRangeSelect(r.id)}
          >
            <Text style={[h.tabText, activeTab === r.id && h.tabTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  container: { 
    backgroundColor: '#18181b', 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  title: { 
    color: '#71717a', 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.5, 
    marginBottom: 12,
    textAlign: 'center'
  },
  tabs: { 
    flexDirection: 'row', 
    gap: 8 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 14, 
    backgroundColor: '#09090b', 
    borderWidth: 1, 
    borderColor: '#27272a' 
  },
  tabActive: { 
    backgroundColor: '#f97316', // El color naranja que buscabas
    borderColor: '#f97316' 
  },
  tabText: { 
    color: '#71717a', 
    fontSize: 11, 
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  tabTextActive: { 
    color: '#fff' 
  },
});
