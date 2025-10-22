import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar as CalendarIcon, Plus, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);

  const utils = trpc.useUtils();

  // Fetch calendars
  const { data: calendars } = trpc.calendars.list.useQuery({
    orgId: 1, // TODO: Get from org context
  });

  const primaryCalendar = calendars?.[0];

  // Fetch events for the current month
  const { data: events } = trpc.events.list.useQuery(
    {
      calendarId: primaryCalendar?.id!,
      startDate: startOfMonth(currentDate),
      endDate: endOfMonth(currentDate),
    },
    { enabled: !!primaryCalendar }
  );

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      setIsCreateEventDialogOpen(false);
      resetEventForm();
    },
  });

  const resetEventForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventLocation("");
    setEventStartTime("");
    setEventEndTime("");
    setEventAllDay(false);
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !primaryCalendar || !selectedDate) return;

    const startDateTime = new Date(selectedDate);
    const endDateTime = new Date(selectedDate);

    if (!eventAllDay && eventStartTime && eventEndTime) {
      const [startHour, startMinute] = eventStartTime.split(":").map(Number);
      const [endHour, endMinute] = eventEndTime.split(":").map(Number);
      startDateTime.setHours(startHour, startMinute);
      endDateTime.setHours(endHour, endMinute);
    }

    createEventMutation.mutate({
      calendarId: primaryCalendar.id,
      title: eventTitle,
      description: eventDescription,
      location: eventLocation,
      startsAt: startDateTime,
      endsAt: endDateTime,
      allDay: eventAllDay,
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events?.filter(event =>
      isSameDay(new Date(event.startsAt), day)
    ) || [];
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event-title">Titre</Label>
                  <Input
                    id="event-title"
                    placeholder="Titre de l'événement..."
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    placeholder="Description..."
                    rows={3}
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-location">Lieu</Label>
                  <Input
                    id="event-location"
                    placeholder="Lieu..."
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={eventAllDay}
                    onCheckedChange={setEventAllDay}
                  />
                  <Label htmlFor="all-day">Toute la journée</Label>
                </div>
                {!eventAllDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Heure de début</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">Heure de fin</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateEventDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateEvent}
                    disabled={!eventTitle.trim() || createEventMutation.isPending}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, "MMMM yyyy", { locale: fr })}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Aujourd'hui
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => (
                <div key={day} className="text-center font-semibold text-sm p-2">
                  {day}
                </div>
              ))}
              
              {/* Add empty cells for days before month starts */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}

              {daysInMonth.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setIsCreateEventDialogOpen(true);
                    }}
                    className={`min-h-24 p-2 rounded-lg border transition-colors text-left ${
                      isCurrentDay
                        ? "bg-primary/10 border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded truncate"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} autre(s)
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <CardTitle>Événements à venir</CardTitle>
          </CardHeader>
          <CardContent>
            {events && events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {format(new Date(event.startsAt), "MMM", { locale: fr })}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {format(new Date(event.startsAt), "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.allDay
                            ? "Toute la journée"
                            : `${format(new Date(event.startsAt), "HH:mm")} - ${format(new Date(event.endsAt), "HH:mm")}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

