'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ClientPortalSidebar } from '@/components/ClientPortalSidebar';
import { UserNav } from '@/components/UserNav';
import { ReactNode, useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';

// A component to access the sidebar context and manage the main content area.
function LayoutManager({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isPortalPage = pathname.startsWith('/portal');

  // Effect to close the mobile sidebar overlay on navigation.
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger /> {/* This button toggles the sidebar state */}
              <h1 className="text-lg font-semibold">{isPortalPage ? 'Portal de Cliente' : 'Panel de Taller'}</h1>
            </div>
            <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
    </SidebarInset>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  // State for the desktop sidebar is now controlled here.
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);

  // This effect collapses the desktop sidebar ONLY on page navigation.
  useEffect(() => {
    setIsDesktopSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <p>Cargando sistema...</p>
      </div>
    );
  }

  const publicAuthPaths = ['/login', '/portal/login', '/register', '/forgot-password'];
  const isPublicPage = publicAuthPaths.includes(pathname);

  if (isPublicPage || !user) {
    return <>{children}</>;
  }

  const isPortalPage = pathname.startsWith('/portal');
  const MainSidebar = isPortalPage ? ClientPortalSidebar : AppSidebar;

  return (
    // The SidebarProvider is now a "controlled" component.
    <SidebarProvider open={isDesktopSidebarOpen} onOpenChange={setIsDesktopSidebarOpen}>
        <MainSidebar />
        <LayoutManager>
            {children}
        </LayoutManager>
    </SidebarProvider>
  );
}
