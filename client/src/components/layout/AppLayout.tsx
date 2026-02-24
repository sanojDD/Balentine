import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Home, Compass, MessageCircle, User, Settings, LogOut, PlusSquare, ShieldAlert } from "lucide-react";
import { CreatePostModal } from "@/components/CreatePostModal";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return <>{children}</>;

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: MessageCircle, label: "Messages", href: "/chat" },
    { icon: User, label: "Profile", href: `/profile/${user.id}` },
  ];

  if (user.role === 'admin') {
    navItems.push({ icon: ShieldAlert, label: "Admin", href: "/admin" });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col items-center md:items-start p-4 fixed h-full z-40 transition-all duration-300">
        <div className="mb-10 w-full flex justify-center md:justify-start md:px-2">
          <Link href="/" className="font-display font-bold text-2xl tracking-tighter text-gradient cursor-pointer">
            <span className="hidden md:inline">SocialAura</span>
            <span className="md:hidden">SA</span>
          </Link>
        </div>

        <nav className="flex-1 w-full space-y-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="w-full block">
              <Button
                variant="ghost"
                className={`w-full justify-center md:justify-start gap-4 hover-elevate transition-all duration-200 ${
                  location === item.href ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                size="lg"
              >
                <item.icon className="w-6 h-6" />
                <span className="hidden md:inline text-lg">{item.label}</span>
              </Button>
            </Link>
          ))}
          
          <CreatePostModal>
            <Button variant="default" className="w-full justify-center md:justify-start gap-4 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" size="lg">
              <PlusSquare className="w-6 h-6" />
              <span className="hidden md:inline text-lg font-semibold">Create Post</span>
            </Button>
          </CreatePostModal>
        </nav>

        <div className="mt-auto w-full pt-4 border-t border-border">
          <div className="flex items-center justify-center md:justify-start gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors w-full mb-4">
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarImage src={user.profilePicture ? `/uploads/${user.profilePicture}` : undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block overflow-hidden">
              <p className="font-semibold text-sm truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.bio || "No bio yet"}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="w-full justify-center md:justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-6 h-6" />
            <span className="hidden md:inline text-lg">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-20 md:ml-64 bg-background min-h-screen pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
