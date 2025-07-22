
"use client";

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import type { DVI, DVIPointStatus } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { fetchDVIAction, updateDVIAction, uploadImageAction, finalizeDVIAction } from './actions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

function StatusButton({ status, current, onClick }: { status: DVIPointStatus, current: DVIPointStatus, onClick: () => void }) {
    const variants = {
        ok: { Icon: CheckCircle2, color: 'text-green-500', label: 'OK' },
        attention: { Icon: AlertTriangle, color: 'text-yellow-500', label: 'Atención' },
        critical: { Icon: XCircle, color: 'text-destructive', label: 'Crítico' },
    }
    const { Icon, color, label } = variants[status];
    const isSelected = status === current;

    return (
        <Button 
            variant={isSelected ? 'default' : 'outline'} 
            className={`flex-1 ${isSelected ? '' : color}`}
            onClick={onClick}
        >
            <Icon className="mr-2 h-5 w-5"/>
            <span>{label}</span>
        </Button>
    )
}

function ImageUploader({ dviId, pointId, onImageUploaded, onImageDeleted, existingImages = [] }: { dviId: string, pointId: string, onImageUploaded: (url: string) => void, onImageDeleted: (url: string) => void, existingImages?: string[] }) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dviId', dviId);
        formData.append('pointId', pointId);

        try {
            const result = await uploadImageAction(formData);
            if (result.success && result.url) {
                onImageUploaded(result.url);
                toast({ title: 'Imagen Subida' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Inesperado', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <Label>Imágenes</Label>
            <div className="grid grid-cols-3 gap-2">
                {existingImages.map(url => (
                    <div key={url} className="relative group">
                         <Image src={url} alt="Punto de inspección" width={150} height={150} className="rounded-md object-cover h-24 w-full" />
                         <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onImageDeleted(url)}
                         >
                            <Trash2 className="h-4 w-4" />
                         </Button>
                    </div>
                ))}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isUploading} />
                <Button variant="outline" className="h-24 w-full flex-col" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8"/>}
                    <span>{isUploading ? 'Subiendo...' : 'Añadir'}</span>
                </Button>
            </div>
        </div>
    )
}

async function generateDVIPDF(dvi: DVI) {
    const doc = new jsPDF();
    const statusText = { ok: 'Bueno', attention: 'Requiere Atención', critical: 'Crítico (Urgente)' };

    // Header
    doc.setFontSize(20);
    doc.text('Informe de Inspección Vehicular (DVI)', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Vehículo: ${dvi.vehicle.make} ${dvi.vehicle.model} - ${dvi.vehicle.plate}`, 105, 30, { align: 'center' });
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 36, { align: 'center' });

    let yPos = 50;

    for (const section of dvi.sections) {
        doc.setFontSize(16);
        doc.text(section.title, 14, yPos);
        yPos += 8;

        const body = section.points.map(p => [
            p.label,
            statusText[p.status],
            p.notes || 'Sin notas'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Punto de Inspección', 'Estado', 'Notas']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            didParseCell: function(data) {
                if(data.column.index === 1) { // Status column
                    const point = section.points[data.row.index];
                    if (point.status === 'critical') data.cell.styles.textColor = '#e74c3c';
                    if (point.status === 'attention') data.cell.styles.textColor = '#f1c40f';
                }
            }
        });
        
        yPos = doc.autoTable.previous.finalY + 10;
        
        // Add images for the section
        const pointsWithImages = section.points.filter(p => p.images && p.images.length > 0);
        if (pointsWithImages.length > 0) {
            doc.addPage();
            yPos = 22;
            doc.setFontSize(16);
            doc.text(`Imágenes de la Sección: ${section.title}`, 14, yPos);
            yPos += 10;

            for (const point of pointsWithImages) {
                 doc.setFontSize(12);
                 doc.text(`- ${point.label}:`, 14, yPos);
                 yPos += 8;
                 
                 for (const imageUrl of point.images!) {
                    try {
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const dataUrl = await new Promise<string>(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        doc.addImage(dataUrl, 'JPEG', 14, yPos, 80, 60);
                        yPos += 70;

                        if (yPos > 250) { // Check if new page is needed
                            doc.addPage();
                            yPos = 22;
                        }
                    } catch (e) {
                        console.error("Error adding image to PDF:", e);
                    }
                 }
            }
            doc.addPage();
            yPos = 22;
        }
    }
    
    doc.save(`DVI-${dvi.vehicle.plate}-${dvi.id.slice(0, 5)}.pdf`);
}


export default function DVIInspectionPage({ params }: { params: { id: string } }) {
    const { id: dviId } = params;
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [dviData, setDviData] = useState<DVI | null>(null);

    const { data: initialDVI, isLoading, isError } = useQuery({
        queryKey: ['dvi', dviId],
        queryFn: () => fetchDVIAction(dviId),
        enabled: !!dviId,
        onSuccess: (data) => {
            if (data) {
                setDviData(JSON.parse(JSON.stringify(data))); // Deep copy
            }
        }
    });

    const updateMutation = useMutation({
        mutationFn: updateDVIAction,
        onSuccess: (result) => {
            if(result.success) {
                toast({ title: 'Progreso Guardado', description: result.message });
                queryClient.invalidateQueries({ queryKey: ['dvi', dviId] });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        }
    });
    
    const finalizeMutation = useMutation({
        mutationFn: finalizeDVIAction,
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['dvi', dviId] });
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        }
    })

    const handleUpdatePoint = (sectionId: string, pointId: string, field: 'status' | 'notes' | 'images', value: any) => {
        if (!dviData) return;
        const updatedSections = dviData.sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    points: s.points.map(p => p.id === pointId ? { ...p, [field]: value } : p)
                };
            }
            return s;
        });
        setDviData({ ...dviData, sections: updatedSections });
    };
    
    const handleImageUploaded = (sectionId: string, pointId: string, url: string) => {
        const point = dviData?.sections.find(s => s.id === sectionId)?.points.find(p => p.id === pointId);
        if (point) {
            const updatedImages = [...(point.images || []), url];
            handleUpdatePoint(sectionId, pointId, 'images', updatedImages);
        }
    }

    const handleImageDeleted = (sectionId: string, pointId: string, url: string) => {
         const point = dviData?.sections.find(s => s.id === sectionId)?.points.find(p => p.id === pointId);
         if (point) {
            const updatedImages = (point.images || []).filter(imgUrl => imgUrl !== url);
            handleUpdatePoint(sectionId, pointId, 'images', updatedImages);
         }
    }

    const handleSaveProgress = () => {
        if (dviData) {
            updateMutation.mutate(dviData);
        }
    };

    const handleFinalize = async () => {
        if (!dviData) return;
        setIsFinalizing(true);
        
        try {
            // First, save any pending changes
            await updateMutation.mutateAsync(dviData);

            // Then, generate the PDF
            await generateDVIPDF(dviData);
            
            // Finally, mark as completed
            await finalizeMutation.mutateAsync(dviId);
            
            toast({ title: 'Inspección Finalizada', description: 'El informe PDF ha sido generado.' });

        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error al Finalizar', description: error.message });
        } finally {
            setIsFinalizing(false);
        }
    }
    
    if (isLoading) return <Skeleton className="h-[80vh] w-full" />
    if (isError) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>No se pudo cargar la inspección.</AlertDescription></Alert>
    if (!dviData) return <Alert><AlertTitle>Inspección no encontrada.</AlertTitle></Alert>
    
    return (
        <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <Button asChild variant="outline" size="sm" className="mb-2">
                            <Link href="/dvi"><ArrowLeft className="mr-2 h-4 w-4"/> Volver</Link>
                        </Button>
                        <h1 className="text-xl font-bold">Inspección para {dviData.vehicle.make} {dviData.vehicle.model}</h1>
                        <p className="text-sm text-muted-foreground">Patente: {dviData.vehicle.plate} | Plantilla: {dviData.templateName}</p>
                    </div>
                     <div className="flex gap-2 self-end">
                        <Button variant="secondary" onClick={handleSaveProgress} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Guardar Progreso
                        </Button>
                        <Button onClick={handleFinalize} disabled={isFinalizing || dviData.status === 'completed'}>
                            {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dviData.status === 'completed' ? 'Inspección Finalizada' : 'Finalizar y Generar PDF'}
                        </Button>
                    </div>
                </div>

                {dviData.status === 'completed' && (
                    <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle className="font-semibold">Inspección Completada</AlertTitle>
                        <AlertDescription>
                            Esta inspección fue finalizada el {dviData.completedAt ? format(dviData.completedAt.toDate(), 'dd/MM/yyyy HH:mm') : ''}.
                        </AlertDescription>
                    </Alert>
                )}

                <Accordion type="single" collapsible className="w-full" defaultValue={dviData.sections[0]?.id}>
                    {dviData.sections.map(section => (
                        <AccordionItem key={section.id} value={section.id}>
                            <AccordionTrigger className="font-bold text-lg bg-muted px-4 rounded-t-md">
                                {section.title}
                            </AccordionTrigger>
                            <AccordionContent className="border border-t-0 p-4 rounded-b-md">
                                <div className="space-y-6">
                                    {section.points.map(point => (
                                        <div key={point.id} className="space-y-3 pt-4 border-t first:border-t-0 first:pt-0">
                                            <Label className="font-semibold text-base">{point.label}</Label>
                                            <div className="flex gap-2">
                                                <StatusButton status="ok" current={point.status} onClick={() => handleUpdatePoint(section.id, point.id, 'status', 'ok')} />
                                                <StatusButton status="attention" current={point.status} onClick={() => handleUpdatePoint(section.id, point.id, 'status', 'attention')} />
                                                <StatusButton status="critical" current={point.status} onClick={() => handleUpdatePoint(section.id, point.id, 'status', 'critical')} />
                                            </div>
                                            <Textarea
                                                placeholder="Añadir notas (opcional)..."
                                                value={point.notes || ''}
                                                onChange={(e) => handleUpdatePoint(section.id, point.id, 'notes', e.target.value)}
                                                disabled={dviData.status === 'completed'}
                                            />
                                            <ImageUploader 
                                                dviId={dviId}
                                                pointId={point.id}
                                                existingImages={point.images}
                                                onImageUploaded={(url) => handleImageUploaded(section.id, point.id, url)}
                                                onImageDeleted={(url) => handleImageDeleted(section.id, point.id, url)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </main>
        </AuthGuard>
    )
}
