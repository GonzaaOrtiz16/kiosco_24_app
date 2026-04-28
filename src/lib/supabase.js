import { createClient } from '@supabase/supabase-js';

// Credenciales de tu proyecto Supabase
const SUPABASE_URL = 'https://dmkbmyisvbuadwvdtkss.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta2JteWlzdmJ1YWR3dmR0a3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDYyMDQsImV4cCI6MjA4ODEyMjIwNH0.Y-N5jDkLjDUNJT_eQH3yXQ0b6YKrVLIJCyxqds1NId8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── PRODUCTOS ──────────────────────────────────────────────────────────────

export const getProducts = async () => {
  // Trae todos los productos ordenados por título
  const { data, error } = await supabase.from('products').select('*').order('title');
  if (error) throw error;
  return data;
};

export const updateStock = async (id, newStock) => {
  // Actualiza el stock de un producto específico
  const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
  if (error) throw error;
};

// ── MOVIMIENTOS Y VENTAS ───────────────────────────────────────────────────

export const getMovementsToday = async () => {
  // Trae los movimientos del día actual para el historial
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const insertMovements = async (movements) => {
  // Registra ventas o anulaciones
  const { error } = await supabase.from('stock_movements').insert(movements);
  if (error) throw error;
};

// ── PERFILES Y SEGURIDAD ───────────────────────────────────────────────────

export const getProfile = async (userId) => {
  // Busca el perfil del usuario (rol y nombre) al iniciar sesión
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, pin')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

/**
 * Crea un nuevo perfil de usuario (Solo accesible para encargados)
 * @param {string} fullName - Nombre del vendedor
 * @param {string} role - 'vendedor' o 'encargado'
 * @param {string} pin - Código de 4 dígitos
 */
export const createSellerProfile = async (fullName, role, pin) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ 
      full_name: fullName, 
      role: role, 
      pin: pin 
    }]);
  if (error) throw error;
  return data;
};

/**
 * Permite a cualquier usuario actualizar su propio PIN de acceso
 * @param {string} userId - ID del usuario actual
 * @param {string} newPin - El nuevo código de 4 dígitos
 */
export const updateMyPin = async (userId, newPin) => {
  const { error } = await supabase
    .from('profiles')
    .update({ pin: newPin })
    .eq('id', userId);
  if (error) throw error;
};