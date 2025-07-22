
"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { DVITemplate, DVISection } from '@/lib/types';
import { fetchDVITemplateAction, updateDVITemplateAction } from './actions';
import Link from 'next/link';

export default function EditDVITemplatePage({ params }: { params: { id: string } }) {
  const { id: templateId } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [templateData, setTemplateData] = useState<DVITemplate | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newPointLabels, setNewPointLabels] = useState<{ [sectionId: string]: string }>({});

  const { data: initialTemplate, isLoading, isError, refetch } = useQuery<DVITemplate | null>({
    queryKey: ['dvi-template', templateId],
    queryFn: () => fetchDVITemplateAction(templateId),
    enabled: !!templateId,
    onSuccess: (data) => {
        if (data) {
            setTemplateData(JSON.parse(JSON.stringify(data))); // Deep copy
        } else {
            setTemplateData(null)
        }
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateDVITemplateAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Éxito', description: 'Plantilla guardada.' });
        refetch(); // Refetch data to get the freshest state from the server
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar la plantilla: ${error.message}` });
    }
  });
  
  const handleAddSection = () => {
    if (!newSectionTitle.trim() || !templateData) return;
    const newSection: DVISection = {
      id: `section-${Date.now()}`,
      title: newSectionTitle,
      points: [],
    };
    setTemplateData({ ...templateData, sections: [...templateData.sections, newSection] });
    setNewSectionTitle('');
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!templateData) return;
    setTemplateData({ ...templateData, sections: templateData.sections.filter(s => s.id !== sectionId) });
  };
  
  const handleAddPoint = (sectionId: string) => {
    const label = newPointLabels[sectionId]?.trim();
    if (!label || !templateData) return;

    const updatedSections = templateData.sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, points: [...s.points, { id: `point-${Date.now()}`, label, status: 'ok' }] };
      }
      return s;
    });
    setTemplateData({ ...templateData, sections: updatedSections });
    setNewPointLabels(prev => ({ ...prev, [sectionId]: '' }));
  };

  const handleDeletePoint = (sectionId: string, pointId: string) => {
    if (!templateData) return;
    const updatedSections = templateData.sections.map(s => {
        if (s.id === sectionId) {
          return { ...s, points: s.points.filter(p => p.id !== pointId) };
        }
        return s;
      });
    setTemplateData({ ...templateData, sections: updatedSections });
  };
  
  const handleSaveTemplate = () => {
    if (templateData) {
        updateMutation.mutate(templateData);
    }
  };
  
  if (isLoading) return <Skeleton className="w-full h-96" />;
  if (isError) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>No se pudo cargar la plantilla.</AlertDescription></Alert>;
  if (!templateData) return (
        <div className="p-4 sm:p-6">
            <Alert variant="destructive">
                <AlertTitle>Plantilla no encontrada</AlertTitle>
                <AlertDescription>La plantilla que buscas no existe o ha sido eliminada.</AlertDescription>
            </Alert>
             <Button asChild variant="outline" className="mt-4">
                <Link href="/dvi/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Plantillas</Link>
            </Button>
        </div>
    );

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between">
            <div>
                 <Button asChild variant="outline" size="sm" className="mb-2">
                    <Link href="/dvi/templates"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Plantillas</Link>
                </Button>
                <h1 className="text-2xl font-bold">Editando: {initialTemplate?.name}</h1>
            </div>
            <Button onClick={handleSaveTemplate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </div>

        <div className="space-y-6">
            {templateData.sections.map(section => (
                <Card key={section.id}>
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(section.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2">
                           {section.points.map(point => (
                               <li key={point.id} className="flex items-center gap-2">
                                   <span className="flex-1 p-2 bg-muted rounded-md text-sm">{point.label}</span>
                                   <Button variant="ghost" size="icon" onClick={() => handleDeletePoint(section.id, point.id)}>
                                       <Trash2 className="h-4 w-4" />
                                   </Button>
                               </li>
                           ))}
                        </ul>
                         <div className="flex items-center gap-2 pt-4 border-t">
                            <Input
                                placeholder="Nuevo punto de inspección (ej. Nivel de aceite)"
                                value={newPointLabels[section.id] || ''}
                                onChange={(e) => setNewPointLabels(p => ({ ...p, [section.id]: e.target.value }))}
                            />
                            <Button onClick={() => handleAddPoint(section.id)}>Añadir Punto</Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Nueva Sección</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                    <Input
                        placeholder="Título de la nueva sección (ej. Motor)"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                    />
                    <Button onClick={handleAddSection}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Sección
                    </Button>
                </CardContent>
            </Card>
        </div>
      </main>
    </AuthGuard>
  );
}
