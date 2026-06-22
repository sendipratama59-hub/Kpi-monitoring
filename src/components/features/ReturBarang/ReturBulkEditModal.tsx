import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Loader2, Save, X, Edit3 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { GenieModal } from '../../ui/GenieModal';

interface ReturBulkEditModalProps {
  selectedIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReturBulkEditModal({ selectedIds, isOpen, onClose, onSuccess }: ReturBulkEditModalProps) {
  const { showAlert } = useAlert();
  const [status, setStatus] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!status && !description) {
      showAlert('Pilih status atau isi keterangan untuk diupdate', 'warning');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (description) updateData.description = description;

      const chunkSize = 50;
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('retur_barang')
          .update(updateData)
          .in('id', chunk);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showAlert('Gagal mengupdate data masal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Masal"
      subtitle={`${selectedIds.length} item terpilih`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            >
              <option value="">Jangan Ubah</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Keterangan</label>
            <textarea 
              rows={3}
              placeholder="Isi untuk menimpa keterangan semua data terpilih..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> UPDATE SEMUA </>}
          </Button>
        </div>
      </div>
    </GenieModal>
  );
}
