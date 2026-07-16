"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService } from "@/services/AdminService";
import { userService } from "@/services/UserService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import type { User as Customer } from "@/types";

type FilterStatus = "all" | "active" | "suspended";

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await adminService.listAllUsers();
      setUsers(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user registry");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (uid: string, currentActive: boolean) => {
    setIsSubmitting(true);
    try {
      await userService.toggleActiveStatus(uid, !currentActive);
      toast.success(currentActive ? "User account suspended" : "User account activated");
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await userService.deleteUser(uid);
      toast.success("User permanently deleted");
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q);
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && u.isActive) ||
      (filterStatus === "suspended" && !u.isActive);
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: users.length,
    active: users.filter(u => u.isActive).length,
    suspended: users.filter(u => !u.isActive).length,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              User Management
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {users.length} registered users · {counts.active} active · {counts.suspended} suspended
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary border border-border rounded-lg p-1">
            {(["all", "active", "suspended"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all ${
                  filterStatus === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f} <span className="ml-1 opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/20 py-20 text-center">
            <CardContent className="space-y-2">
              <Users className="h-10 w-10 text-muted-foreground/45 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">
                {search ? "No users match your search" : "No users registered yet"}
              </p>
              <p className="text-xs text-muted-foreground/60">
                Users appear here when they register on the platform.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">User</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Role / Provider</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const joinedDate = u.createdAt?.toDate
                      ? new Date(u.createdAt.toDate()).toLocaleDateString()
                      : "—";
                    return (
                      <tr
                        key={u.uid}
                        className="border-b border-border hover:bg-secondary/40 transition-colors text-foreground"
                      >
                        {/* User */}
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border overflow-hidden">
                              {u.photoURL ? (
                                <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{u.displayName || "—"}</p>
                              <p className="text-[10px] text-muted-foreground/75 font-mono">{u.uid.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="p-4 space-y-0.5">
                          <p className="text-foreground flex items-center gap-1 font-semibold">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            {u.email}
                          </p>
                          {u.phone && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              {u.phone}
                            </p>
                          )}
                        </td>

                        {/* Role */}
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            u.role === "customer"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {u.role}
                          </span>
                          <p className="text-[9px] text-muted-foreground/80 mt-0.5 font-semibold">{u.provider}</p>
                        </td>

                        {/* Joined */}
                        <td className="p-4">
                          <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            {joinedDate}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            u.isActive
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {u.isActive ? (
                              <><ShieldCheck className="h-2.5 w-2.5" /> Active</>
                            ) : (
                              <><ShieldAlert className="h-2.5 w-2.5" /> Suspended</>
                            )}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSubmitting}
                              onClick={() => handleToggleStatus(u.uid, u.isActive)}
                              className={`h-7 w-7 rounded-lg ${
                                u.isActive
                                  ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                  : "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              }`}
                              title={u.isActive ? "Suspend" : "Activate"}
                            >
                              {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSubmitting}
                              onClick={() => handleDelete(u.uid)}
                              className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-border">
              {filteredUsers.map((u) => {
                const joinedDate = u.createdAt?.toDate
                  ? new Date(u.createdAt.toDate()).toLocaleDateString()
                  : "—";
                return (
                  <div key={u.uid} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border overflow-hidden">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-foreground text-sm truncate">{u.displayName || "—"}</p>
                        <p className="text-[10px] text-muted-foreground/75 font-mono truncate">{u.uid.slice(0, 8)}...</p>
                      </div>
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        u.role === "customer"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {u.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-foreground bg-secondary/30 p-2.5 rounded-xl border border-border">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Contact</span>
                        <div className="text-right">
                          <p className="flex items-center justify-end gap-1 font-semibold truncate text-foreground">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            {u.email}
                          </p>
                          {u.phone && (
                            <p className="text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-1.5 mt-1.5">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Joined</span>
                        <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          {joinedDate}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Provider</span>
                        <span className="text-muted-foreground/80 font-semibold">{u.provider}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        u.isActive
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}>
                        {u.isActive ? (
                          <><ShieldCheck className="h-2.5 w-2.5" /> Active</>
                        ) : (
                          <><ShieldAlert className="h-2.5 w-2.5" /> Suspended</>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleToggleStatus(u.uid, u.isActive)}
                          className={`h-8 px-3 rounded-lg text-xs gap-1 ${
                            u.isActive
                              ? "text-amber-500 hover:text-amber-600 border-amber-500/20 hover:bg-amber-500/10"
                              : "text-green-500 hover:text-green-600 border-green-500/20 hover:bg-green-500/10"
                          }`}
                          title={u.isActive ? "Suspend" : "Activate"}
                        >
                          {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          {u.isActive ? "Suspend" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleDelete(u.uid)}
                          className="h-8 px-3 rounded-lg text-xs text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10 gap-1"
                          title="Delete User"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span>Showing {filteredUsers.length} of {users.length} users</span>
              <span>{counts.active} active · {counts.suspended} suspended</span>
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
