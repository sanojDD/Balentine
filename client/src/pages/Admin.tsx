import { useUsers, useAdminActions } from "@/hooks/use-users";
import { useFeed } from "@/hooks/use-posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Shield, Ban, Trash2, CheckCircle2 } from "lucide-react";

export default function AdminPage() {
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: posts = [], isLoading: loadingPosts } = useFeed();
  const { banUser, deleteUser } = useAdminActions();

  if (loadingUsers || loadingPosts) {
    return <div className="p-8 text-center">Loading admin dashboard...</div>;
  }

  return (
    <div className="py-8 px-4 max-w-6xl mx-auto space-y-12">
      <header className="flex items-center gap-4 border-b border-border pb-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, posts, and platform moderation</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Total Users</h3>
          <p className="text-4xl font-bold">{users.length}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Total Posts</h3>
          <p className="text-4xl font-bold">{posts.length}</p>
        </div>
        <div className="glass-panel p-6 rounded-3xl border-destructive/20 bg-destructive/5">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Banned Users</h3>
          <p className="text-4xl font-bold text-destructive">
            {users.filter(u => u.isBanned).length}
          </p>
        </div>
      </div>

      {/* User Management Table */}
      <section className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="hover:bg-white/5">
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.profilePicture ? `/uploads/${u.profilePicture}` : undefined} />
                      <AvatarFallback>{u.username.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{u.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {u.isBanned ? (
                      <span className="flex items-center gap-1 text-destructive text-sm font-semibold">
                        <Ban className="w-4 h-4" /> Banned
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-500 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant={u.isBanned ? "outline" : "secondary"} 
                      size="sm"
                      onClick={() => banUser.mutate({ id: u.id, isBanned: !u.isBanned })}
                      disabled={banUser.isPending || u.role === 'admin'}
                      className={!u.isBanned ? "hover:bg-destructive hover:text-white" : ""}
                    >
                      {u.isBanned ? "Unban" : "Ban"}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if(confirm("Are you sure you want to delete this user completely?")) {
                          deleteUser.mutate(u.id);
                        }
                      }}
                      disabled={deleteUser.isPending || u.role === 'admin'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
