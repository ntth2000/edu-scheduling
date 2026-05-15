import { SidebarProvider } from "@/components/ui/sidebar"
import AppSidebar from "./Sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {children}
            </main>
        </SidebarProvider>
    )
}