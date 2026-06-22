import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Loader2, Save, X, Package, User, Calendar, MessageSquare, Hash } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { GenieModal } from '../../ui/GenieModal';

interface ReturEditModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
}

export function ReturEditModal({ record, isOpen, onClose, onSuccess, categories }: ReturEditModalProps) {
  const { showAlert } = useAlert();
  const [returnDate, setReturnDate] = useState('');
  const [goodsCode, setGoodsCode] = useState('');
  const [goodsName, setGoodsName] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState(1);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const filteredCategories = categories.filter(cat => 
    cat.toLowerCase().includes(category.toLowerCase())
  );

  useEffect(() => {
    if (record) {
      setReturnDate(record.return_date);
      setGoodsCode(record.goods_code || '');
      setGoodsName(record.goods_name || '');
      setCategory(record.category || '');
      setQty(record.qty || 1);
      setDescription(record.description || '');
    }
  }, [record]);

  const handleSave = async () => {
    if (!goodsName || !goodsCode) {
      showAlert('Nama dan kode barang tidak boleh kosong', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('retur_barang').update({
        return_date: returnDate,
        goods_code: goodsCode,
        goods_name: goodsName,
        category: category,
        qty: qty,
        description: description
      }).eq('id', record.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showAlert('Gagal mengupdate data retur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GenieModal
      isOpen={isOpen && !!record}
      onClose={onClose}
      title="Edit Data Retur"
      subtitle={record?.customer_name}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Retur</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Barang</label>
              <input 
                type="text"
                value={goodsCode}
                onChange={(e) => setGoodsCode(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty Awal</label>
              <input 
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Barang</label>
            <input 
              type="text"
              value={goodsName}
              onChange={(e) => setGoodsName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Kategori Produk</span>
              <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1.5 rounded">{categories.length} Kategori</span>
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Pilih atau ketik kategori..."
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setShowCatDropdown(true);
                }}
                onFocus={() => setShowCatDropdown(true)}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
              {showCatDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 max-h-48 overflow-y-auto">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCategory(cat);
                          setShowCatDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 hover:bg-slate-50 text-left text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0"
                      >
                        {cat}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 italic">Kategori baru akan ditambahkan</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keterangan</label>
            <textarea 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
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
