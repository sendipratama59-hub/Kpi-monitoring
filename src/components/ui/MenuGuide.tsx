import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Info } from 'lucide-react';

interface MenuGuideProps {
  menuId: string;
}

export function MenuGuide({ menuId }: MenuGuideProps) {
  const [guide, setGuide] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchGuide();
  }, [menuId]);

  const fetchGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('app_guides')
        .select('guide_text')
        .eq('menu_id', menuId)
        .maybeSingle();

      if (data?.guide_text) {
        setGuide(data.guide_text);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } catch (err) {
      console.error('Error fetching guide:', err);
      setIsVisible(false);
    }
  };

  if (!isVisible || !guide) return null;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 print:hidden">
      <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700">
          <Info className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Panduan & Catatan</span>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <span className="text-[10px]">Sembunyikan</span>
        </button>
      </div>
      <div 
        className="p-4 text-sm text-slate-700 max-w-none"
        dangerouslySetInnerHTML={{ __html: guide }}
      />
    </div>
  );
}
