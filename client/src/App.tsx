import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/Auth";
import FeedPage from "@/pages/Feed";
import ProfilePage from "@/pages/Profile";
import ChatPage from "@/pages/Chat";
import AdminPage from "@/pages/Admin";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

// Protected Route Wrapper
function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        
        {/* Protected Routes */}
        <Route path="/">
          {() => <ProtectedRoute component={FeedPage} />}
        </Route>
        
        <Route path="/profile/:id">
          {() => <ProtectedRoute component={ProfilePage} />}
        </Route>

        <Route path="/chat">
          {() => <ProtectedRoute component={ChatPage} />}
        </Route>

        <Route path="/admin">
          {() => <ProtectedRoute component={AdminPage} adminOnly={true} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
