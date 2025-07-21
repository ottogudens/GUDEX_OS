
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createPurchaseInvoice } from '@/lib/mutations'; // This function needs to be created
import { PurchaseInvoiceSchema } from '@/lib/schemas'; // This schema needs to be created
import { fetchProviders, fetchProducts } from '@/lib/data'; // Assuming fetchProviders and fetchProducts exist
import type { Provider, Product } from '@/lib/types';

type PurchaseInvoiceFormData = z.infer<typeof PurchaseInvoiceSchema>;

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadData() {
      const [providerData, productData] = await Promise.all([
          fetchProviders(),
          fetchProducts()
      ]);
      setProviders(providerData);
      setProducts(productData);
    }
    loadData();
  }, []);

  const form = useForm<PurchaseInvoiceFormData>({
    resolver: zodResolver(PurchaseInvoiceSchema),
    defaultValues: {
      providerId: '',
      invoiceNumber: '',
      date: new Date(),
      items: [{ productId: '', quantity: 1, purchasePrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = (data: PurchaseInvoiceFormData) => {
    startTransition(async () => {
      try {
        await createPurchaseInvoice(data);
        toast({
          title: 'Factura Registrada',
          description: 'La factura de compra ha sido registrada con éxito.',
        });
        router.push('/purchases');
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo registrar la factura de compra.',
        });
      }
    });
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar Nueva Factura de Compra</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número de Factura</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: F-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Ítems de la Factura</h3>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-2 border rounded-lg">
                    <div className="col-span-6">
                        <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Producto</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un producto" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad</FormLabel>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-3">
                        <FormField
                            control={form.control}
                            name={`items.${index}.purchasePrice`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio Compra (Unitario)</FormLabel>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))}/>
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="col-span-1">
                        <Button variant="outline" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => append({ productId: '', quantity: 1, purchasePrice: 0 })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Ítem
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Factura
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
