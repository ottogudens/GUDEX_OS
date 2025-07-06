
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Car, Settings, CalendarPlus, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/Logo';

const navItems = [
  { href: '/portal/dashboard', icon: LayoutDashboard, label: 'Mi Panel', tooltip: 'Panel' },
  { href: '/portal/vehicles', icon: Car, label: 'Mis Vehículos', tooltip: 'Mis Vehículos' },
  { href: '/portal/schedule', icon: CalendarPlus, label: 'Agendar Cita', tooltip: 'Agendar Cita' },
  { href: '/portal/budgets', icon: FileText, label: 'Mis Presupuestos', tooltip: 'Mis Presupuestos' },
  { href: '/portal/receipts', icon: FileText, label: 'Mis Comprobantes', tooltip: 'Mis Comprobantes' },
  { href: '/portal/ai-assistant', icon: Sparkles, label: 'Asistente IA', tooltip: 'Asistente IA' },
];

export function ClientPortalSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
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
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.tooltip}
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/portal/settings')} tooltip="Configuración">
              <Link href="/portal/settings" onClick={handleLinkClick}>
                <Settings />
                <span>Mi Cuenta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
