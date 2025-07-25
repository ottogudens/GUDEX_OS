
"use client";

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';

// Esquema de validación del formulario
const flowSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  keywords: z.array(z.string()).min(1, 'Se requiere al menos una palabra clave.'),
  responses: z.array(z.object({
      content: z.string().min(1, 'El contenido de la respuesta no puede estar vacío.'),
  })).min(1, 'Se requiere al menos una respuesta.'),
  isEnabled: z.boolean(),
});

type FlowFormData = z.infer<typeof flowSchema>;

// Tipo para el flujo completo, incluyendo el ID
export type Flow = FlowFormData & { _id?: string };

interface FlowFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Flow) => void;
  isSubmitting: boolean;
  initialData?: Flow | null;
}

export function FlowFormDialog({ isOpen, onClose, onSubmit, isSubmitting, initialData }: FlowFormDialogProps) {
  const form = useForm<FlowFormData>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
        name: '',
        keywords: [],
        responses: [{ content: '' }],
        isEnabled: true,
    }
  });
  
  const { fields: responseFields, append: appendResponse, remove: removeResponse } = useFieldArray({
    control: form.control,
    name: "responses",
  });
  
  const [keywordInput, setKeywordInput] = React.useState('');

  useEffect(() => {
      if (initialData) {
          form.reset(initialData);
      } else {
          form.reset({
              name: '',
              keywords: [],
              responses: [{ content: '' }],
              isEnabled: true,
          });
      }
  }, [initialData, form]);

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (newKeyword && !form.getValues('keywords').includes(newKeyword)) {
        form.setValue('keywords', [...form.getValues('keywords'), newKeyword]);
        setKeywordInput('');
      }
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    form.setValue('keywords', form.getValues('keywords').filter(kw => kw !== keywordToRemove));
  };
  
  const handleFormSubmit = (data: FlowFormData) => {
      const finalData = initialData ? { ...initialData, ...data } : data;
      onSubmit(finalData);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Flujo' : 'Crear Nuevo Flujo'}</DialogTitle>
          <DialogDescription>
            Configura las palabras clave y las respuestas automáticas para este flujo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)}>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="p-6 space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nombre del Flujo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: Flujo de Bienvenida" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="keywords"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Palabras Clave (Keywords)</FormLabel>
                                <FormControl>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            placeholder="Escribe una palabra y presiona Enter..."
                                            value={keywordInput}
                                            onChange={e => setKeywordInput(e.target.value)}
                                            onKeyDown={handleKeywordKeyDown}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {field.value.map(kw => (
                                                <Badge key={kw} variant="secondary" className="flex items-center gap-1">
                                                    {kw}
                                                    <button type="button" onClick={() => removeKeyword(kw)} className="ml-1 font-bold">&times;</button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div>
                        <Label>Respuestas en Orden</Label>
                        <div className="space-y-4 pt-2">
                            {responseFields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`responses.${index}.content`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <Textarea placeholder={`Respuesta #${index + 1}...`} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeResponse(index)} disabled={responseFields.length <= 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendResponse({ content: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Respuesta
                        </Button>
                    </div>

                    <FormField
                        control={form.control}
                        name="isEnabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Activar Flujo</FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        Si está desactivado, el bot no responderá a las palabras clave de este flujo.
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Flujo'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
