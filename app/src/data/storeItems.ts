import { supabase } from '../lib/supabase';

export interface StoreItem {
  key: string;
  label: string;
  icon: string;
  description: string;
  priceCoins: number;
}

export async function fetchStoreItems(): Promise<StoreItem[]> {
  const { data, error } = await supabase
    .from('store_items')
    .select('key, label, icon, description, price_coins, order_index')
    .order('order_index');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    key: r.key,
    label: r.label,
    icon: r.icon,
    description: r.description,
    priceCoins: r.price_coins,
  }));
}
