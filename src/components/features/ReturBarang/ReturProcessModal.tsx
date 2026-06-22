import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Search, Loader2, Save, X, Package, Trash2, Plus, Info, CheckCircle as CheckCircleIcon } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { GenieModal } from '../../ui/GenieModal';

const CheckCircle = CheckCircleIcon;

interface Product {
  goods_code: string;
  goods_name: string;
}

interface ReplacementItem {
  goods_code: string;
  goods_name: string;
  qty: number;
}

interface ReturProcessModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
}

export function ReturProcessModal({ record, isOpen, onClose, onSuccess, products }: ReturProcessModalProps) {
  const { showAlert } = useAlert();
  const [finishedQty, setFinishedQty] = useState(0);
  const [useReplacement, setUseReplacement] = useState(false);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [prodSearch, setProdSearch] = useState('');
  const [showProdDropdown, setShowProdDropdown] = useState(false);

  useEffect(() => {
    if (record) {
      setFinishedQty(record.finished_qty || 0);
      
      // Load from replacements JSONB if exists, otherwise try legacy single fields
      if (record.replacements && Array.isArray(record.replacements) && record.replacements.length > 0) {
        setReplacements(record.replacements);
        setUseReplacement(true);
      } else if (record.replacement_goods_code) {
        setReplacements([{
          goods_code: record.replacement_goods_code,
          goods_name: record.replacement_goods_name || '',
          qty: record.replacement_qty || 1
        }]);
        setUseReplacement(true);
      } else {
        setReplacements([]);
        setUseReplacement(false);
      }
    }
  }, [record]);

  const handleSave = async () => {
    setLoading(true);
    try {
      let status = 'Pending';
      if (finishedQty >= record.qty) status = 'Completed';
      else if (finishedQty > 0) status = 'Partial';

      const updateData: any = {
        finished_qty: finishedQty,
        status: status,
        replacements: useReplacement ? replacements : []
      };

      // Keep legacy fields in sync for now (using first replacement if available)
      if (useReplacement && replacements.length > 0) {
        updateData.replacement_goods_code = replacements[0].goods_code;
        updateData.replacement_goods_name = replacements[0].goods_name;
        updateData.replacement_qty = replacements[0].qty;
      } else {
        updateData.replacement_goods_code = null;
        updateData.replacement_goods_name = null;
        updateData.replacement_qty = 0;
      }

      const { error } = await supabase.from('retur_barang').update(updateData).eq('id', record.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showAlert('Gagal memproses data retur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addReplacement = (p: Product) => {
    if (replacements.some(r => r.goods_code === p.goods_code)) {
      showAlert('Produk sudah ada di daftar pengganti', 'warning');
      return;
    }
    setReplacements([...replacements, { ...p, qty: 1 }]);
    setProdSearch('');
    setShowProdDropdown(false);
  };

  const removeReplacement = (code: string) => {
    setReplacements(replacements.filter(r => r.goods_code !== code));
  };

  const updateReplacementQty = (code: string, newQty: number) => {
    setReplacements(replacements.map(r => r.goods_code === code ? { ...r, qty: Math.max(1, newQty) } : r));
  };

  const filteredProducts = products.filter(p => 
    p.goods_name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.goods_code.toLowerCase().includes(prodSearch.toLowerCase())
  ).slice(0, 50); // Show more results in dropdown

  return (
    <GenieModal
      isOpen={isOpen && !!record}
      onClose={onClose}
      title="Proses Retur"
      subtitle={`${record?.goods_name} (${record?.qty} items)`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
            Qty Selesai (PCS)
          </label>
          <input 
            type="number"
            max={record?.qty}
            min="0"
            value={finishedQty}
            onChange={(e) => setFinishedQty(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xl font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total item retur: {record?.qty}</p>
        </div>

        <div className="pt-4 border-t border-slate-50 space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Package className="w-3 h-3 mr-1 text-indigo-500" />
              Ganti Barang
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Input Barang Ganti</span>
              <input 
                type="checkbox" 
                checked={useReplacement} 
                onChange={(e) => setUseReplacement(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
            </div>
          </div>

          {useReplacement && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-2 relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Cari produk pengganti..."
                    value={prodSearch}
                    onChange={(e) => {
                      setProdSearch(e.target.value);
                      setShowProdDropdown(true);
                    }}
                    onFocus={() => setShowProdDropdown(true)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                {showProdDropdown && prodSearch && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 max-h-60 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <button
                          key={p.goods_code}
                          onClick={() => addReplacement(p)}
                          className="w-full px-4 py-2 hover:bg-slate-50 text-left flex justify-between items-center transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{p.goods_name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{p.goods_code}</span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-indigo-500 bg-indigo-50 rounded" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-[10px] text-slate-400 italic">Produk tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Barang Pengganti terpilih</label>
                {replacements.length > 0 ? (
                  <div className="space-y-2">
                    {replacements.map((item) => (
                      <div key={item.goods_code} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 group animate-in slide-in-from-left-2 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate">{item.goods_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 font-mono">{item.goods_code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateReplacementQty(item.goods_code, parseInt(e.target.value) || 1)}
                            className="w-12 px-2 py-1 bg-white border border-slate-200 rounded text-center text-xs font-black text-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
                          />
                          <button 
                            onClick={() => removeReplacement(item.goods_code)}
                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <Package className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada barang pengganti</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-xl text-slate-500 font-bold"
          >
            Batal
          </Button>
          <Button 
            disabled={loading}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-black shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> SIMPAN </>}
          </Button>
        </div>
      </div>
    </GenieModal>
  );
}
 
