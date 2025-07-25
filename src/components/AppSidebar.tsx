"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, FileText, ShoppingCart, ConciergeBell, Megaphone, Package, Cpu, ReceiptText, ChevronDown, Wrench, ClipboardList, Mail, Calendar, MessageCircle } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { useAuth, User } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

type SubNavItem = {
  href: string;
  label: string;
  tooltip: string;
};

type NavItem = {
  href?: string;
  icon: React.ElementType;
  label: string;
  tooltip: string;
  roles: User['role'][];
  children?: NavItem[] | SubNavItem[];
};


const allNavItems: NavItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Panel', tooltip: 'Panel', roles: ['Administrador', 'Mecanico'] },
  { 
    label: 'Taller', 
    icon: Wrench, 
    tooltip: 'Gestión del Taller', 
    roles: ['Administrador', 'Mecanico'],
    children: [
        { href: '/customers', label: 'Clientes', tooltip: 'Lista de Clientes' },
        { href: '/vehicles', label: 'Vehículos', tooltip: 'Lista de Vehículos' },
        { href: '/appointments', label: 'Citas', tooltip: 'Citas' },
        { href: '/work-orders', label: 'Órdenes de Trabajo', tooltip: 'Órdenes de Trabajo' },
        { href: '/dvi', label: 'Inspecciones (DVI)', tooltip: 'Inspección Vehicular Digital' },
        { href: '/budgets', label: 'Presupuestos', tooltip: 'Presupuestos' },
    ]
  },
  { 
    label: 'Servicios', 
    icon: ConciergeBell, 
    tooltip: 'Servicios', 
    roles: ['Administrador'],
    children: [
        { href: '/services', label: 'Lista de Servicios', tooltip: 'Servicios del Taller' },
        { href: '/categories', label: 'Categorías', tooltip: 'Categorías de Servicios' },
    ]
  },
  { 
    label: 'Productos', 
    icon: Package, 
    tooltip: 'Gestión de Productos', 
    roles: ['Administrador'],
    children: [
        { href: '/products', label: 'Lista de Productos', tooltip: 'Inventario de Productos' },
        { href: '/products/categories', label: 'Categorías', tooltip: 'Categorías de Productos' },
    ]
  },
   { 
    label: 'Control de Stock', 
    icon: ClipboardList, 
    tooltip: 'Control de Stock e Inventario', 
    roles: ['Administrador', 'Mecanico'],
    children: [
        { href: '/inventory/stock-take', label: 'Toma de Inventario', tooltip: 'Toma de Inventario' },
        { href: '/inventory/stock-adjustment', label: 'Ajuste de Stock', tooltip: 'Ajuste de Stock' },
        { href: '/inventory/records', label: 'Registros', tooltip: 'Registros de Stock' },
    ]
  },
  { 
    label: 'Ventas', 
    icon: ShoppingCart,
    tooltip: 'Ventas y Punto de Venta', 
    roles: ['Administrador'],
    children: [
      { href: '/pos', label: 'Punto de Venta', tooltip: 'Punto de Venta' },
      { href: '/sales/summary', label: 'Resumen de Ventas', tooltip: 'Resumen de Ventas' },
      { href: '/sales/billing', label: 'Facturación', tooltip: 'Facturación' },
      { href: '/sales/receipts', label: 'Comprobantes', tooltip: 'Comprobantes' },
      { href: '/sales/cash-register', label: 'Caja', tooltip: 'Caja' },
      { href: '/sales/history', label: 'Historial de Cajas', tooltip: 'Historial de Cajas' },
    ]
  },
  { 
    href: '/purchases/providers', 
    icon: FileText, 
    label: 'Compras', 
    tooltip: 'Gestión de Compras', 
    roles: ['Administrador'],
  },
  { href: '/agenda', icon: Calendar, label: 'Agenda', tooltip: 'Integración de Agenda', roles: ['Administrador'] },
  { 
    label: 'WhatsApp Bot', 
    icon: MessageCircle, 
    tooltip: 'Gestionar WhatsApp Bot', 
    roles: ['Administrador'],
    children: [
        { href: '/settings/whatsapp', label: 'Gestionar Flujos', tooltip: 'Crear y editar flujos' },
        { href: '/settings/whatsapp/status', label: 'Estado del Servicio', tooltip: 'Estado y acciones del bot' },
    ]
  },
  { href: '/emails', icon: Mail, label: 'Correos', tooltip: 'Gestión de Correos', roles: ['Administrador'] },
  { href: '/marketing', icon: Megaphone, label: 'Publicidad', tooltip: 'Publicidad y Promociones', roles: ['Administrador'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = React.useState<string[]>([]);

  React.useEffect(() => {
    const activeParent = allNavItems.find(item => 
      item.children?.some(child => 
        pathname.startsWith(child.href!) || 
        ('children' in child && child.children && child.children.some((subChild: any) => pathname.startsWith(subChild.href!)))
      )
    );
    if (activeParent && !openSubmenus.includes(activeParent.label)) {
      setOpenSubmenus(prev => [...prev, activeParent.label]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = allNavItems.filter(item => user && item.roles.includes(user.role));

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };
  
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = hasChildren
        ? item.children!.some(child => 
            pathname.startsWith(child.href!) || 
            ('children' in child && child.children && child.children.some((subChild: any) => pathname.startsWith(subChild.href!)))
          )
        : (item.href ? (item.href === '/' ? pathname === item.href : pathname.startsWith(item.href)) : false);

      if (hasChildren) {
        const isSubmenuOpen = openSubmenus.includes(item.label);
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.tooltip}
              onClick={() => toggleSubmenu(item.label)}
              className="justify-between"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <item.icon />
                <span className="truncate">{item.label}</span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
            </SidebarMenuButton>
            {isSubmenuOpen && (
              <SidebarMenuSub>
                {item.children!.map(child => {
                  if ('children' in child && child.children) {
                    return (
                      <div key={child.label}>
                        <SidebarMenuButton
                            isActive={child.children.some((subChild: any) => pathname.startsWith(subChild.href!))}
                            tooltip={child.tooltip}
                            onClick={() => toggleSubmenu(child.label)}
                            className="justify-between"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <child.icon />
                            <span className="truncate">{child.label}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openSubmenus.includes(child.label) ? 'rotate-180' : ''}`} />
                        </SidebarMenuButton>
                        {openSubmenus.includes(child.label) && (
                          <SidebarMenuSub>
                            {child.children.map((subChild: any) => {
                              const isChildActive = subChild.href === '/' ? pathname === subChild.href : pathname.startsWith(subChild.href);
                              return (
                                <SidebarMenuSubItem key={subChild.href}>
                                  <SidebarMenuSubButton asChild isActive={isChildActive}>
                                    <Link href={subChild.href!} onClick={handleLinkClick}>
                                      <span>{subChild.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </div>
                    );
                  }
                  
                  const isChildActive = child.href === '/' ? pathname === child.href : pathname.startsWith(child.href!);
                  return (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton asChild isActive={isChildActive}>
                        <Link href={child.href!} onClick={handleLinkClick}>
                          <span>{child.label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.tooltip}
          >
            <Link href={item.href!} onClick={handleLinkClick}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-center p-2 group-data-[collapsible=icon]:hidden">
          <Logo width={144} height={48} className="h-auto w-36" />
        </div>
        <div className="hidden items-center justify-center p-2 group-data-[collapsible=icon]:flex">
           <Logo width={32} height={11} className="h-auto w-8" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {renderNavItems(navItems)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/settings'} tooltip="Configuración">
              <Link href="/settings" onClick={handleLinkClick}>
                <Settings />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
