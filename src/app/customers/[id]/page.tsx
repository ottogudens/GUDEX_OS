
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Car, Mail, Phone, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/AuthGuard';
import { fetchCustomerById, fetchVehiclesByCustomerId, fetchServiceHistoryByVehicleIds } from '@/lib/data';
import { Customer, Vehicle, ServiceHistory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Map<string, Vehicle>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const customerData = await fetchCustomerById(customerId);
        if (!customerData) {
          setLoading(false);
          setCustomer(null);
          return;
        }
        setCustomer(customerData);

        const vehiclesData = await fetchVehiclesByCustomerId(customerId);
        setCustomerVehicles(vehiclesData);

        if (vehiclesData.length > 0) {
          const vehicleIds = vehiclesData.map(v => v.id);
          const historyData = await fetchServiceHistoryByVehicleIds(vehicleIds);
          setServiceHistory(historyData.serviceHistory);
          
          const vMap = new Map<string, Vehicle>();
          historyData.vehicles.forEach(v => vMap.set(v.id, v));
          setVehiclesMap(vMap);
        }
      } catch (error) {
        console.error("Failed to fetch customer details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [customerId]);
  
  const pageContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Card className="w-full sm:w-1/3"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card className="w-full sm:w-2/3"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      );
    }

    if (!customer) {
      return (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Cliente no encontrado</h1>
          <p className="text-muted-foreground">El cliente que buscas no existe o no tienes permisos para verlo.</p>
          <Button asChild className="mt-4">
            <Link href="/customers">Volver a Clientes</Link>
          </Button>
        </div>
      );
    }
    
    return (
     <Tabs defaultValue="summary" className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
            <TabsList>
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
                <TabsTrigger value="history">Historial de Servicio</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="summary" className="space-y-4">
            <Card>
                <CardHeader className="items-center text-center">
                    <Avatar className="w-24 h-24 mb-4">
                        <AvatarImage src={`https://placehold.co/100x100.png`} />
                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{customer.name}</CardTitle>
                    <CardDescription>Cliente desde {customer.memberSince}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                    </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="vehicles">
             <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Car />Vehículos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {customerVehicles.length > 0 ? (
                        customerVehicles.map(vehicle => (
                            <div key={vehicle.id} className="p-3 border rounded-md">
                                <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                <p className="text-xs text-muted-foreground">VIN: {vehicle.vin}</p>
                            </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay vehículos registrados para este cliente.</p>
                      )}
                  </div>
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wrench />Historial de Servicios</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead>Vehículo</TableHead>
                                <TableHead className="text-right">Costo</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceHistory.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay historial de servicios.</TableCell>
                              </TableRow>
                            ) : (
                            serviceHistory.map(history => {
                                const vehicle = vehiclesMap.get(history.vehicleId);
                                return (
                                  <TableRow key={history.id}>
                                    <TableCell>{history.date}</TableCell>
                                    <TableCell className="font-medium">{history.service}</TableCell>
                                    <TableCell>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(history.cost)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={history.status === 'Completado' ? 'secondary' : 'default'}>{history.status}</Badge>
                                    </TableCell>
                                </TableRow>
                                );
                            })
                          )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    )
  };
  
  return (
    <AuthGuard allowedRoles={['Administrador', 'Mecanico']}>
      {pageContent()}
    </AuthGuard>
  );
}
