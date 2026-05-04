import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function HistoryNavigator({ onRangeChange }) {
  const [activeTab, setActiveTab] = useState('day');

  // Opciones de filtrado
  const ranges = [
    { id: 'day', label: 'Hoy' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
  ];

  const handleRangeSelect = (rangeId) => {
    setActiveTab(rangeId);
    
    const now = new Date();
    let start = new Date();
    let end = new Date();

    // Resetear horas para que el filtro sea exacto
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (rangeId) {
      case 'day':
        // Ya están seteadas a hoy por defecto
        break;
      case 'week':
        // Restar 7 días
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        // Ir al primer día del mes actual
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        // Ir al primer día del año
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }

    // Le pasamos las fechas calculadas al componente padre
    onRangeChange(start, end, rangeId);
  };

  return (
    <View style={h.container}>
      <Text style={h.title}>VER HISTORIAL POR PERÍODO</Text>
      <View style={h.tabs}>
        {ranges.map((r) => (
          <TouchableOpacity
            key={r.id}
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
    backgroundColor: '#f97316', 
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