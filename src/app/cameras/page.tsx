"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/components/AuthGuard';
import { Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCameras } from '@/lib/data';
import type { Camera } from '@/lib/types';

// The mock HLS stream URL. In a real-world scenario, you would have a media server
// that converts each RTSP stream to a unique HLS URL.
const MOCK_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export default function CamerasPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCameraName, setSelectedCameraName] = useState<string>('');

  const loadCameras = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCameras();
      setCameras(data);
      if (data.length > 0) {
        setSelectedCameraName(data[0].name);
      }
    } catch (error) {
      console.error("Failed to fetch cameras:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameras.length) return;

    // We always use the mock URL for playback in this prototype
    const streamUrl = MOCK_HLS_URL;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(error => console.error("Error trying to play video:", error));
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(error => console.error("Error trying to play video:", error));
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [cameras]); // This effect now runs once when cameras are loaded

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
                <Video /> Visualización de Cámaras
            </CardTitle>
            <CardDescription>
              Selecciona una cámara para ver la transmisión en vivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full max-w-md">
                <Label htmlFor="camera-select">Seleccionar Cámara</Label>
                {loading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select value={selectedCameraName} onValueChange={setSelectedCameraName} disabled={cameras.length === 0}>
                        <SelectTrigger id="camera-select">
                            <SelectValue placeholder="Elige una cámara..." />
                        </SelectTrigger>
                        <SelectContent>
                            {cameras.length > 0 ? (
                                cameras.map((camera) => (
                                    <SelectItem key={camera.id} value={camera.name}>
                                        {camera.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="no-cameras" disabled>No hay cámaras configuradas</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border">
              <video
                ref={videoRef}
                controls
                muted
                autoPlay
                className="w-full h-full"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
