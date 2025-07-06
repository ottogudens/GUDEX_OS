// src/components/VehiclePhotoCapture.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

export function VehiclePhotoCapture() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Error', description: 'Tu navegador no soporta el acceso a la cámara.' });
        return;
      }
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(cameraStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Acceso a cámara denegado',
          description: 'Por favor, habilita los permisos de cámara en tu navegador.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotos(prev => [...prev, dataUrl]);
    }
  };

  const deletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Captura de Fotos</CardTitle>
        <CardDescription>Documenta el estado del vehículo.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Alert variant="destructive" className="w-auto">
                    <AlertTitle>Cámara No Disponible</AlertTitle>
                    <AlertDescription>
                        Revisa los permisos de tu navegador.
                    </AlertDescription>
                </Alert>
            </div>
          )}
        </div>
        <Button onClick={takePhoto} disabled={!hasCameraPermission}>
          <Camera className="mr-2 h-4 w-4" />
          Tomar Foto
        </Button>
        <div className="flex-1 space-y-2">
            <h3 className="font-semibold">Fotos Capturadas ({photos.length})</h3>
            {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                            <Image src={photo} alt={`Vehicle photo ${index + 1}`} width={150} height={100} className="rounded-md w-full h-auto object-cover" />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deletePhoto(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Aún no se han tomado fotos.</p>
            )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
