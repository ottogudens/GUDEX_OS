
"use client"; 

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { es } from 'date-fns/locale';
import { AuthGuard } from '@/components/AuthGuard';

type Appointment = {
  time: string;
  customer: string;
  vehicle: string;
  service: string;
};

export default function AppointmentsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newAppointment, setNewAppointment] = useState({ customer: '', vehicle: '', service: '', time: '09:00' });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement> | string, field: string) => {
    if (typeof e === 'string') {
      setNewAppointment(prev => ({ ...prev, [field]: e }));
    } else {
      const { id, value } = e.target;
      setNewAppointment(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAppointment.customer && newAppointment.vehicle && newAppointment.service) {
      // Format time to AM/PM
      const [hour, minute] = newAppointment.time.split(':');
      const formattedHour = parseInt(hour, 10) % 12 || 12;
      const ampm = parseInt(hour, 10) >= 12 ? 'PM' : 'AM';
      const formattedTime = `${formattedHour}:${minute} ${ampm}`;

      setAppointments(prev => [...prev, { ...newAppointment, time: formattedTime }].sort((a, b) => a.time.localeCompare(b.time)));
      setNewAppointment({ customer: '', vehicle: '', service: '', time: '09:00' });
    }
  };

  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      <div className="grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Citas</CardTitle>
                <CardDescription>Gestiona el horario de tu taller.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Agendar Nueva
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Cita</DialogTitle>
                    <DialogDescription>
                      Completa el formulario para agendar una nueva cita.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddAppointment}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer">Nombre del Cliente</Label>
                        <Input id="customer" placeholder="ej. Juan Pérez" value={newAppointment.customer} onChange={(e) => handleFormChange(e, 'customer')} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="vehicle">Vehículo</Label>
                        <Input id="vehicle" placeholder="ej. Toyota Camry 2021" value={newAppointment.vehicle} onChange={(e) => handleFormChange(e, 'vehicle')} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="service">Tipo de Servicio</Label>
                        <Select value={newAppointment.service} onValueChange={(value) => handleFormChange(value, 'service')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un servicio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cambio de Aceite">Cambio de Aceite</SelectItem>
                            <SelectItem value="Servicio de Frenos">Servicio de Frenos</SelectItem>
                            <SelectItem value="Servicio de Llantas">Servicio de Llantas</SelectItem>
                            <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="grid gap-2">
                        <Label htmlFor="time">Hora</Label>
                        <Input id="time" type="time" value={newAppointment.time} onChange={(e) => handleFormChange(e, 'time')} required />
                      </div>
                      <DialogClose asChild>
                        <Button type="submit" className="w-full">
                          Confirmar Cita
                        </Button>
                      </DialogClose>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                locale={es}
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                Próximas para el {date ? date.toLocaleDateString('es-ES') : 'día seleccionado'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {appointments.length > 0 ? appointments.map((apt, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-lg border"
                >
                  <div className="font-bold text-accent">{apt.time}</div>
                  <div>
                    <p className="font-semibold">{apt.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.vehicle}
                    </p>
                    <p className="text-sm">{apt.service}</p>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground">
                  No hay citas para este día.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
