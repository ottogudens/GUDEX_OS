
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export default function AgendaPage() {
  return (
    <AuthGuard allowedRoles={['Administrador']}>
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar />
            Integración con Google Calendar
          </CardTitle>
          <CardDescription>
            Conecta y gestiona la sincronización de tu agenda de citas con Google Calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
            <Calendar className="w-12 h-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Módulo en Construcción</h2>
            <p className="mt-2 text-muted-foreground">
                Esta sección permitirá autenticar tu cuenta de Google y seleccionar un calendario para sincronizar las citas de la aplicación.
            </p>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
