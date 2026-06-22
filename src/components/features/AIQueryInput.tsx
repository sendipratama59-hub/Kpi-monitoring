import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sparkles, Send } from 'lucide-react';
import { askGemini } from '../../services/gemini';
import Markdown from 'react-markdown';
import { supabase } from '../../services/supabase';

export function AIQueryInput() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    
    try {
      // Tarik konteks dari Supabase berdasarkan limit yang diizinkan prompt AI
      const { data, error } = await supabase
        .from('sales_data')
        .select('region, revenue, units_sold, transaction_date')
        .limit(100); // Batasi supaya tidak melebihi konteks token
        
      let dataContext = '';
      if (error) {
        dataContext = 'Context Error: Gagal mengakses data Supabase - ' + error.message;
      } else if (data && data.length > 0) {
        dataContext = JSON.stringify(data);
      } else {
        dataContext = 'Tidak ada data di database sales_data.';
      }
      
      const aiResponse = await askGemini(query, dataContext);
      setResponse(aiResponse);
    } catch (err: any) {
      setResponse(`**Error:** ${err.message}`);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <CardTitle>Tanya AI</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-3">
        <div className="flex-1 bg-slate-50 rounded-md p-3 mb-3 overflow-y-auto min-h-[220px] border border-slate-100">
          {!response && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6 opacity-20 mb-2" />
                <p className="text-xs">Silakan tanya tentang performa KPI, misalnya:</p>
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center max-w-sm">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-sm cursor-pointer hover:bg-indigo-100" onClick={() => setQuery("Bagaimana KPI sales di area Bandung bulan ini?")}>
                    "Bagaimana KPI sales di area Bandung bulan ini?"
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-sm cursor-pointer hover:bg-indigo-100" onClick={() => setQuery("Region mana yang memiliki revenue tertinggi?")}>
                    "Region mana yang memiliki revenue tertinggi?"
                  </span>
                </div>
             </div>
          )}
          
          {loading && (
             <div className="flex items-center gap-2 text-indigo-600 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI sedang menganalisis data...</span>
             </div>
          )}

          {response && (
             <div className="prose prose-sm prose-slate max-w-none">
               <Markdown>{response}</Markdown>
             </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-sm border border-slate-300 px-2 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Tanyakan insight dari data Anda..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !query.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
