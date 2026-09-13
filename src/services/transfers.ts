import { supabase } from '../lib/supabase';
import { Transfer } from '../types';

export const fetchTransfers = async (): Promise<Transfer[]> => {
  const { data, error } = await supabase.from('transfers').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching transfers:', error);
    return [];
  }
  return data as Transfer[];
};

export const saveTransfer = async (transfer: Partial<Transfer>): Promise<Transfer | null> => {
  if (transfer.id) {
    const { data, error } = await supabase
      .from('transfers')
      .update(transfer)
      .eq('id', transfer.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating transfer:', error);
      return null;
    }
    return data as Transfer;
  } else {
    const { data, error } = await supabase
      .from('transfers')
      .insert([transfer])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating transfer:', error);
      return null;
    }
    return data as Transfer;
  }
};

export const deleteTransfer = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('transfers').delete().eq('id', id);
  if (error) {
    console.error('Error deleting transfer:', error);
    return false;
  }
  return true;
};
