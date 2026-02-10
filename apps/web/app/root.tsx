import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  NavLink,
  useRouteLoaderData,
} from "react-router";
import type { LinksFunction } from "react-router";
import {
  ClipboardList,
  Package,
  Beer,
  Container,
  BarChart3,
  Menu,
  X,
  LogOut,
  Boxes,
  Users,
  ShoppingCart,
  Truck,
  FileText,
  Settings,
} from "lucide-react";
import { useState } from "react";
import "~/app.css";

export const links: LinksFunction = () => [];

const navGroups = [
  {
    label: "Brewing",
    items: [
      { to: "/recipes", label: "Recipes", icon: ClipboardList },
      { to: "/batches", label: "Batches", icon: Beer },
      { to: "/vessels", label: "Vessels", icon: Container },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/inventory", label: "Raw Materials", icon: Package },
      { to: "/stock", label: "Finished Goods", icon: Boxes },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/orders", label: "Orders", icon: ShoppingCart },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
      { to: "/purchasing", label: "Purchasing", icon: FileText },
    ],
  },
  {
    label: "Planning",
    items: [
      { to: "/planning", label: "Planning", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <Beer className="h-6 w-6 text-primary" />
          BrewPlan
        </NavLink>
        {onClose && (
          <button onClick={onClose} className="p-2 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 min-h-[44px] text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <form method="post" action="/logout">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 min-h-[44px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile: overlay, desktop: fixed */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-lg">BrewPlan</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
