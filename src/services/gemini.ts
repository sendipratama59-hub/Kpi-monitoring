export async function askGemini(question: string, dataContext?: string): Promise<string> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, dataContext }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Terjadi kesalahan pada server AI.');
    }

    const result = await response.json();
    return result.text || "Tidak ada respon dari AI.";
  } catch (error: any) {
    console.error('Error with Gemini Proxy:', error);
    throw new Error(error.message || 'Gagal menghubungi AI. Pastikan server sudah siap.');
  }
}
