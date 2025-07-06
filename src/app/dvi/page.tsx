
"use client";

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DVIChecklist } from '@/components/DVIChecklist';
import { VehiclePhotoCapture } from '@/components/VehiclePhotoCapture';
import { AuthGuard } from '@/components/AuthGuard';

export default function DVIPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Inspección Digital de Vehículo (DVI)</CardTitle>
                        <CardDescription>
                            {orderId ? `Orden de Trabajo: ${orderId}` : 'Realiza una inspección completa del vehículo.'}
                        </CardDescription>
                    </CardHeader>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                     <DVIChecklist />
                     <VehiclePhotoCapture />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="outline">Guardar Borrador</Button>
                    <Button>Finalizar y Enviar al Cliente</Button>
                </div>
            </div>
        </AuthGuard>
    );
}
