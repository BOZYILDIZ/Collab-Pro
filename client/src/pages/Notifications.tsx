import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Notifications() {
  const utils = trpc.useUtils();
  
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
    },
  });

  const getNotificationIcon = (type: string) => {
    // Return different icons based on notification type
    return <Bell className="w-5 h-5" />;
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      chat: "text-blue-500",
      mention: "text-purple-500",
      event: "text-green-500",
      appointment: "text-orange-500",
      note: "text-yellow-500",
      system: "text-gray-500",
    };
    return colors[type] || "text-gray-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {notifications && notifications.some(n => !n.isRead) && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${
                  !notification.isRead ? "border-l-4 border-l-primary bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          {notification.body && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {notification.type}
                          </Badge>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune notification</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

