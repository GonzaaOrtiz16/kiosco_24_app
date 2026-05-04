import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ebozyekhpyusahieqfqq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4edHLTXC7n7XGga2RByPKQ_LaeEvGPZ'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── PRODUCTOS ─────────────────────────────────────────────────────────────

export const getProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name'); 
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error en getProducts:", err.message);
    throw err;
  }
};

export const insertProduct = async (productData) => {
  const { data, error } = await supabase
    .from('products')
    .insert([
      {
        barcode: productData.barcode,
        name: productData.name,
        price: productData.price,
        stock: productData.stock,
        category: productData.category
      }
    ]);
  if (error) throw error;
  return data;
};

export const updateStock = async (id, newStock) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error en updateStock:", err.message);
    throw err;
  }
};

// ── MOVIMIENTOS Y VENTAS (CON FILTRO POR RANGO) ───────────────────────────

export const getMovementsByRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error en getMovementsByRange:", err.message);
    return [];
  }
};

export const getMovementsToday = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return await getMovementsByRange(start, end);
};

export const insertMovements = async (movements) => {
  try {
    const { error } = await supabase
      .from('stock_movements')
      .insert(movements);
    if (error) throw error;
  } catch (err) {
    console.error("Error en insertMovements:", err.message);
    throw err;
  }
};

// ── PERFILES Y SEGURIDAD ───────────────────────────────────────────────────

export const getSellerProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error en getSellerProfiles:", err.message);
    throw err;
  }
};

/**
 * Crea perfil de usuario. 
 * Se eliminó la conversión automática a 'seller' para mantener consistencia con la DB.
 */
export const createSellerProfile = async (fullName, role, pin) => {
  try {
    // Normalizamos a minúsculas pero sin traducir el término
    const cleanRole = role.toLowerCase().trim();

    const { data, error } = await supabase
      .from('profiles')
      .insert([{ 
        full_name: fullName, 
        role: cleanRole, 
        pin: String(pin) 
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  } catch (err) {
    console.error("Error en createSellerProfile:", err.message);
    throw err;
  }
};

export const updateMyPin = async (userId, newPin) => {
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pin: String(newPin) })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    return true;
  } catch (err) {
    console.error("Error en updateMyPin:", err.message);
    throw err;
  }
};