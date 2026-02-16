"use client";

import {Button} from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {ScrollArea} from "@/components/ui/scroll-area";
import {apiFetch} from "@/lib/api-client";
import {useAuth} from "@/lib/auth-context";
import type {Notification} from "@/lib/types";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Bell, CheckCheck, KeyRound, ShieldCheck, ShieldX} from "lucide-react";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export function NotificationBell() {
  const {session} = useAuth();
  const queryClient = useQueryClient();

  const {data} = useQuery<NotificationsResponse>({
    queryKey: ["notifications", session?.userId],
    queryFn: () => apiFetch(`/notifications?userId=${session?.userId}`),
    enabled: !!session?.userId,
    refetchInterval: 5000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiFetch("/notifications", {
      method: "PATCH",
      body: JSON.stringify({userId: session?.userId, markAll: true}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", session?.userId],
      });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (notificationId: string) => apiFetch("/notifications", {
      method: "PATCH",
      body: JSON.stringify({notificationId}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", session?.userId],
      });
    },
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  function getNotifIcon(type: Notification["type"]) {
    switch (type) {
      case "access_request":
        return <KeyRound className="h-4 w-4 text-primary" />;
      case "access_granted":
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case "access_rejected":
        return <ShieldX className="h-4 w-4 text-destructive" />;
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount} notificacoes nao lidas
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 border-border bg-card p-0"
        align="end"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-card-foreground">
            Notificacoes
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs text-primary hover:text-primary/80"
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificacao
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) {
                      markOneMutation.mutate(notif.id);
                    }
                  }}
                  className={`flex items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${!notif.read ? "bg-primary/5" : ""
                    }`}
                >
                  <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                  <div className="flex-1">
                    <p
                      className={`text-xs leading-relaxed ${!notif.read
                          ? "font-medium text-card-foreground"
                          : "text-muted-foreground"
                        }`}
                    >
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
