import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        setIsCaptured(true);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setIsCaptured(false);
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-center p-6 text-white space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="font-medium">{error}</p>
            <Button onClick={onClose} variant="outline" className="text-white border-white hover:bg-white/10">Tutup</Button>
          </div>
        ) : !isCaptured ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
              <button
                type="button"
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <div className="w-16 h-16 rounded-full border-2 border-slate-400" />
              </button>
              <div className="w-12" /> {/* Spacer for balance */}
            </div>
          </>
        ) : (
          <>
            <img src={capturedImage!} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-6">
              <button
                type="button"
                onClick={retakePhoto}
                className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg transition-all"
              >
                <RefreshCw className="w-5 h-5" /> Ulangi
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg transition-all"
              >
                <Check className="w-5 h-5" /> Gunakan Foto
              </button>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />

      <p className="text-white/50 text-xs mt-4">Posisikan toko di dalam bingkai kamera</p>
    </div>
  );
}
