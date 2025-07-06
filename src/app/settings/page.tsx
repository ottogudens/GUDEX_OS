"use client";

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AuthGuard } from '@/components/AuthGuard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import type { User, UserRole, WorkshopSettings, Camera, EmailSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { fetchUsers, fetchWorkshopSettings, fetchCameras, fetchEmailSettings } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  addUser,
  deleteUser, 
  updateUser, 
  updateWorkshopSettings, 
  createCamera,
  updateCamera,
  deleteCamera,
  updateEmailSettings,
  migrateExistingDataToCorrelativeCodes
} from '@/lib/mutations';
import { 
  WorkshopSettingsSchema,
  AddUserSchema,
  CameraSchema,
  EmailSettingsSchema
} from '@/lib/schemas';
import { useSettings } from '@/context/SettingsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

const initialProfileState: WorkshopSettings = {
  name: '', rut: '', address: '', phone: '', whatsapp: '', facebook: '', instagram: '', logoUrl: ''
};

const initialCameraState: Partial<Camera> = {
  name: '', rtspUrl: ''
};

const initialEmailState: EmailSettings = {
  host: 'smtp.hostinger.com', port: 465, user: '', pass: '', from: '', secure: true
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { refreshSettings } = useSettings();
  const [isPending, startTransition] = useTransition();

  // Workshop Profile State
  const [workshopProfile, setWorkshopProfile] = useState<WorkshopSettings>(initialProfileState);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [newUserRole, setNewUserRole] = useState<UserRole | ''>('');

  // Camera Management State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isEditingCamera, setIsEditingCamera] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<Partial<Camera>>(initialCameraState);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(initialEmailState);
  const [loadingEmail, setLoadingEmail] = useState(true);


  const loadAllData = React.useCallback(async () => {
    setLoadingProfile(true);
    setLoadingUsers(true);
    setLoadingCameras(true);
    setLoadingEmail(true);

    try {
        const [settingsData, usersData, camerasData, emailData] = await Promise.all([
            fetchWorkshopSettings(),
            fetchUsers(),
            fetchCameras(),
            fetchEmailSettings()
        ]);
        setWorkshopProfile(settingsData);
        setUsers(usersData);
        setCameras(camerasData);
        setEmailSettings(emailData.host ? emailData : initialEmailState); // Use defaults if nothing is fetched
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar todos los datos de configuración.' });
    } finally {
        setLoadingProfile(false);
        setLoadingUsers(false);
        setLoadingCameras(false);
        setLoadingEmail(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  // Profile Handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setWorkshopProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: formData.get('name'),
      rut: formData.get('rut'),
      address: formData.get('address'),
      phone: formData.get('phone'),
      whatsapp: formData.get('whatsapp'),
      facebook: formData.get('facebook'),
      instagram: formData.get('instagram'),
    };
    
    const validatedFields = WorkshopSettingsSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
      toast({ variant: 'destructive', title: 'Error de validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
      return;
    }

    startTransition(async () => {
      try {
        const newLogoUrl = await updateWorkshopSettings(validatedFields.data, logoFile, workshopProfile.logoUrl);
        toast({ title: 'Éxito', description: 'Configuración guardada exitosamente.' });
        setWorkshopProfile(prev => ({...prev, ...validatedFields.data, logoUrl: newLogoUrl }));
        if (logoPreview) setLogoPreview(null);
        setLogoFile(null);
        refreshSettings();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al guardar', description: error.message || 'No se pudo guardar la configuración.' });
      }
    });
  };
  
  // User Handlers
  const handleAddUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const validatedFields = AddUserSchema.safeParse(data);
    if (!validatedFields.success) {
      toast({ variant: 'destructive', title: 'Error de validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
      return;
    }
    
    startTransition(async () => {
        try {
            await addUser(validatedFields.data);
            toast({ title: 'Éxito', description: 'Usuario añadido correctamente.' });
            await loadAllData();
            setIsAddUserOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al añadir usuario', description: error.message || 'No se pudo añadir el usuario.' });
        }
    });
  };

  const openEditUserDialog = (user: User) => {
    setUserToEdit(user);
    setNewUserRole(user.role);
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = () => {
    if (!userToEdit || !newUserRole) return;
    startTransition(async () => {
      try {
        await updateUser(userToEdit.id!, { role: newUserRole });
        toast({ title: 'Éxito', description: 'Rol de usuario actualizado.' });
        setUsers(users.map(u => u.id === userToEdit.id ? { ...u, role: newUserRole as UserRole } : u));
        setIsEditUserOpen(false);
        setUserToEdit(null);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el rol.' });
      }
    });
  };
  
  const handleDeleteUser = (userId: string) => {
    startTransition(async () => {
        try {
            await deleteUser(userId);
            toast({ title: 'Éxito', description: 'Usuario eliminado.' });
            setUsers(users.filter(u => u.id !== userId));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el usuario.' });
        }
    });
  };

  // Camera Handlers
  const openCameraDialog = (camera?: Camera) => {
    if (camera) {
      setIsEditingCamera(true);
      setCurrentCamera(camera);
    } else {
      setIsEditingCamera(false);
      setCurrentCamera(initialCameraState);
    }
    setIsCameraDialogOpen(true);
  };
  
  const closeCameraDialog = () => {
    setIsCameraDialogOpen(false);
    setCurrentCamera(initialCameraState);
  };

  const handleCameraFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCurrentCamera(prev => ({ ...prev, [id]: value }));
  };

  const handleCameraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validatedFields = CameraSchema.safeParse(currentCamera);
    if (!validatedFields.success) {
      toast({ variant: 'destructive', title: 'Error de validación', description: validatedFields.error.flatten().fieldErrors.name?.[0] || validatedFields.error.flatten().fieldErrors.rtspUrl?.[0] });
      return;
    }

    startTransition(async () => {
      try {
        if (isEditingCamera && currentCamera.id) {
          await updateCamera(currentCamera.id, validatedFields.data);
          toast({ title: 'Éxito', description: 'Cámara actualizada.' });
        } else {
          await createCamera(validatedFields.data);
          toast({ title: 'Éxito', description: 'Cámara añadida.' });
        }
        await loadAllData();
        closeCameraDialog();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo guardar la cámara.' });
      }
    });
  };
  
  const handleDeleteCamera = () => {
    if (!cameraToDelete) return;
    startTransition(async () => {
      try {
        await deleteCamera(cameraToDelete.id);
        toast({ title: 'Éxito', description: `Cámara "${cameraToDelete.name}" eliminada.` });
        await loadAllData();
        setCameraToDelete(null);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cámara.' });
      }
    });
  };
  
  // Email Settings Handlers
  const handleEmailSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setEmailSettings(prev => ({ ...prev, [id]: type === 'number' ? Number(value) : value }));
  };

  const handleEmailSecureChange = (checked: boolean) => {
    setEmailSettings(prev => ({ ...prev, secure: checked }));
  };

  const handleEmailSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validatedFields = EmailSettingsSchema.safeParse(emailSettings);
    if (!validatedFields.success) {
      toast({ variant: 'destructive', title: 'Error de validación', description: Object.values(validatedFields.error.flatten().fieldErrors).flat().join(', ') });
      return;
    }

    startTransition(async () => {
      try {
        // We only save non-sensitive data to Firestore.
        const { host, port, from, secure } = validatedFields.data;
        await updateEmailSettings({ host, port, from, secure });
        toast({ title: 'Éxito', description: 'Configuración de correo guardada.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error al guardar', description: error.message || 'No se pudo guardar la configuración de correo.' });
      }
    });
  };

  const handleMigration = () => {
    startTransition(async () => {
      try {
        const result = await migrateExistingDataToCorrelativeCodes();
        toast({
          title: 'Migración completada',
          description: `Se actualizaron ${result.productsUpdated} productos y ${result.servicesUpdated} servicios.`
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error en la migración',
          description: error.message || 'No se pudo completar la migración de datos.'
        });
      }
    });
  };

  return (
    <AuthGuard allowedRoles={['Administrador']}>
      <Tabs defaultValue="profile" className="max-w-4xl mx-auto space-y-6">
        <div>
            <h1 className="text-3xl font-bold font-headline">Configuración</h1>
            <p className="text-muted-foreground">Gestiona todos los aspectos de tu sistema.</p>
        </div>

        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="email">Correo</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="cameras">Cámaras</TabsTrigger>
            <TabsTrigger value="data">Datos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
            <form onSubmit={handleProfileSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Perfil del Taller</CardTitle>
                        <CardDescription>
                        Actualiza la información pública y de contacto de tu negocio.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    {loadingProfile ? <Skeleton className="h-96 w-full" /> : (
                        <>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre del Taller</Label>
                                <Input id="name" name="name" defaultValue={workshopProfile.name} onChange={handleProfileChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rut">RUT / Identificación Fiscal</Label>
                                <Input id="rut" name="rut" defaultValue={workshopProfile.rut} onChange={handleProfileChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" name="address" defaultValue={workshopProfile.address} onChange={handleProfileChange} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" name="phone" defaultValue={workshopProfile.phone} onChange={handleProfileChange} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp</Label>
                            <Input id="whatsapp" name="whatsapp" defaultValue={workshopProfile.whatsapp} onChange={handleProfileChange} />
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                            <Label htmlFor="facebook">Facebook (URL)</Label>
                            <Input id="facebook" name="facebook" defaultValue={workshopProfile.facebook} onChange={handleProfileChange} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="instagram">Instagram (URL)</Label>
                            <Input id="instagram" name="instagram" defaultValue={workshopProfile.instagram} onChange={handleProfileChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="logo">Logo del Taller</Label>
                            <div className="flex items-center gap-4">
                                <Image 
                                    src={logoPreview || workshopProfile.logoUrl || 'https://placehold.co/200x66.png'} 
                                    alt="Logo preview" 
                                    width={200}
                                    height={66}
                                    className="rounded-md border p-2 bg-muted object-contain"
                                />
                                <div>
                                    <Input id="logo" name="logo" type="file" className="file:text-foreground" accept="image/*" onChange={handleLogoChange} />
                                    <p className="text-xs text-muted-foreground mt-1">Sube un archivo de imagen (PNG, JPG, SVG).</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Cambios'}</Button>
                        </div>
                        </>
                    )}
                    </CardContent>
                </Card>
            </form>
        </TabsContent>

        <TabsContent value="email">
            <form onSubmit={handleEmailSettingsSubmit}>
                <Card>
                    <CardHeader>
                    <CardTitle>Configuración de Correo (SMTP)</CardTitle>
                    <CardDescription>
                        Configura los datos públicos de tu servidor SMTP. Las credenciales (usuario y contraseña) deben ser configuradas de forma segura en las variables de entorno del servidor.
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    {loadingEmail ? <Skeleton className="h-64 w-full" /> : (
                        <>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                            <Label htmlFor="host">Servidor SMTP</Label>
                            <Input id="host" value={emailSettings.host} onChange={handleEmailSettingsChange} placeholder="smtp.hostinger.com" />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="port">Puerto</Label>
                            <Input id="port" type="number" value={emailSettings.port} onChange={handleEmailSettingsChange} placeholder="465" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="from">Correo Remitente</Label>
                            <Input id="from" value={emailSettings.from} onChange={handleEmailSettingsChange} placeholder="noreply@tu-dominio.com" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="secure" 
                                checked={emailSettings.secure} 
                                onCheckedChange={handleEmailSecureChange}
                            />
                            <Label htmlFor="secure">Usar cifrado SSL/TLS (Recomendado)</Label>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Activa esta opción si usas el puerto 465. Desactívala si usas el puerto 587 (STARTTLS).
                        </div>
                        <div className="p-4 border-l-4 border-accent bg-accent/20 text-accent-foreground rounded-r-lg">
                            <p className="font-semibold">Nota de Seguridad</p>
                            <p className="text-sm">Para proteger tus credenciales, el usuario y la contraseña de SMTP se deben configurar en el archivo <code>.env</code> de tu proyecto con las variables <code>SMTP_USER</code> y <code>SMTP_PASS</code>.</p>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending}>{isPending ? 'Guardando...' : 'Guardar Configuración de Correo'}</Button>
                        </div>
                        </>
                    )}
                    </CardContent>
                </Card>
            </form>
        </TabsContent>

        <TabsContent value="users">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Administración de Usuarios</CardTitle>
                        <CardDescription>
                        Gestiona los usuarios y sus roles en el sistema.
                        </CardDescription>
                    </div>
                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                        <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Usuario
                        </Button>
                        </DialogTrigger>
                        <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                                Completa el formulario para añadir un nuevo usuario al sistema.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddUserSubmit}>
                            <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input id="name" name="name" placeholder="ej. María Rodriguez" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input id="email" name="email" type="email" placeholder="ej. maria.r@example.com" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Rol</Label>
                                <Select name="role" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Administrador">Administrador</SelectItem>
                                        <SelectItem value="Mecanico">Mecanico</SelectItem>
                                        <SelectItem value="Cliente">Cliente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Añadiendo...' : 'Añadir Usuario'}
                            </Button>
                            </div>
                        </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>
                                <span className="sr-only">Acciones</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingUsers ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end">
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menú</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar Rol
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción eliminará el perfil de {user.name} de la base de datos. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteUser(user.id!)} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                                                            {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                        </div>
                                    </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="cameras">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Configuración de Cámaras</CardTitle>
                        <CardDescription>Añade y gestiona las cámaras de seguridad del taller.</CardDescription>
                    </div>
                    <Button onClick={() => openCameraDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Cámara
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre de la Cámara</TableHead>
                                <TableHead>Dirección RTSP</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingCameras ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : cameras.length > 0 ? (
                                cameras.map((camera) => (
                                    <TableRow key={camera.id}>
                                        <TableCell className="font-medium">{camera.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{camera.rtspUrl}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Abrir menú</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openCameraDialog(camera)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Editar</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setCameraToDelete(camera)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>Eliminar</span>
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No hay cámaras configuradas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="data">
            <Card>
            <CardHeader>
                <CardTitle>Operaciones de Datos</CardTitle>
                <CardDescription>Ejecuta operaciones de mantenimiento en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isPending}>
                    {isPending ? 'Migrando...' : 'Asignar Códigos a Ítems Antiguos'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar migración de datos?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción asignará un código correlativo a todos los productos y servicios existentes que no tengan uno. Es una operación segura que solo se necesita ejecutar una vez.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMigration} disabled={isPending}>
                        Sí, ejecutar
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                Usa esta opción si tienes productos o servicios creados antes de implementar los códigos correlativos.
                </p>
            </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
       <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Rol de {userToEdit?.name}</DialogTitle>
                    <DialogDescription>
                        Selecciona un nuevo rol para este usuario.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-role">Rol</Label>
                        <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                            <SelectTrigger id="edit-role">
                                <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Administrador">Administrador</SelectItem>
                                <SelectItem value="Mecanico">Mecanico</SelectItem>
                                <SelectItem value="Cliente">Cliente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancelar</Button>
                    <Button onClick={handleEditUserSubmit} disabled={isPending}>
                      {isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Camera Add/Edit Dialog */}
        <Dialog open={isCameraDialogOpen} onOpenChange={closeCameraDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditingCamera ? 'Editar Cámara' : 'Añadir Nueva Cámara'}</DialogTitle>
                </DialogHeader>
                 <form onSubmit={handleCameraSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre de la Cámara</Label>
                            <Input id="name" placeholder="ej. Cámara Taller Principal" value={currentCamera.name || ''} onChange={handleCameraFormChange} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rtspUrl">Dirección RTSP</Label>
                            <Input id="rtspUrl" placeholder="rtsp://..." value={currentCamera.rtspUrl || ''} onChange={handleCameraFormChange} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? 'Guardando...' : 'Guardar Cámara'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        {/* Camera Delete Confirmation */}
        <AlertDialog open={!!cameraToDelete} onOpenChange={() => setCameraToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de eliminar esta cámara?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente la cámara "{cameraToDelete?.name}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCamera} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                      {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </AuthGuard>
  );
}
