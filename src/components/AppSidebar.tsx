import { Calendar, Users, DollarSign, FileText, Home, Settings, Package, UserPlus } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import beeWiseLogo from "@/assets/beewise-logo.png";
import { FREEMIUM_MODE } from "@/config/freemium";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Pacotes e Serviços", url: "/pacotes-servicos", icon: Package },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Cadastros", url: "/cadastros", icon: UserPlus },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

// FREEMIUM MODE: Filter out subscription-related menu items
const menuItems = FREEMIUM_MODE 
  ? allMenuItems 
  : allMenuItems;

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path) 
      ? "bg-primary/20 text-primary border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className={`border-r border-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-48 sm:w-64"
      }`}
      collapsible="icon"
    >
      <SidebarContent className="bg-card">
        <div className="p-3 sm:p-4 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <img src={beeWiseLogo} alt="BeeWise Logo" className="w-8 h-8 object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="font-bold text-base sm:text-lg text-foreground truncate">BeeWise</h2>
                <p className="text-xs text-muted-foreground">ProAgenda</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full">
                     <NavLink 
                       to={item.url} 
                       className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 ${getNavCls(item.url)}`}
                     >
                       <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                       {!collapsed && (
                         <span className="font-medium text-sm sm:text-base truncate">{item.title}</span>
                       )}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
