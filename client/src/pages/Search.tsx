import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Search as SearchIcon, FileText, CheckSquare, MessageSquare, Calendar, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Search() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "notes" | "tasks" | "messages" | "events" | "users">("all");

  const { data: searchResults, isLoading: searching, refetch } = trpc.search.global.useQuery(
    {
      query: searchQuery,
      types: activeTab === "all" ? undefined : [activeTab],
    },
    {
      enabled: !!user && searchQuery.length >= 2,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      refetch();
    }
  };

  const totalResults = searchResults
    ? Object.values(searchResults).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0)
    : 0;

  if (loading || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Recherche globale</h1>
          <p className="text-muted-foreground">
            Recherchez dans toutes vos notes, tâches, messages, événements et contacts
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher... (minimum 2 caractères)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-20 h-12 text-lg"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </form>

        {searchQuery.length >= 2 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {searching ? "Recherche en cours..." : `${totalResults} résultat(s) trouvé(s)`}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">
                  Tous {searchResults && `(${totalResults})`}
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes {searchResults && `(${searchResults.notes?.length || 0})`}
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tâches {searchResults && `(${searchResults.tasks?.length || 0})`}
                </TabsTrigger>
                <TabsTrigger value="messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages {searchResults && `(${searchResults.messages?.length || 0})`}
                </TabsTrigger>
                <TabsTrigger value="events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Événements {searchResults && `(${searchResults.events?.length || 0})`}
                </TabsTrigger>
                <TabsTrigger value="users">
                  <User className="h-4 w-4 mr-2" />
                  Utilisateurs {searchResults && `(${searchResults.users?.length || 0})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!searching && searchResults && (
              <div className="space-y-6">
                {(activeTab === "all" || activeTab === "notes") && searchResults.notes && searchResults.notes.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notes ({searchResults.notes.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.notes.map((note: any) => (
                        <Link key={note.id} href={`/notes/${note.id}`}>
                          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                            <CardHeader>
                              <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                              {note.contentMarkdown && (
                                <CardDescription className="line-clamp-2">
                                  {note.contentMarkdown.substring(0, 100)}...
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                {note.isPublic && <Badge variant="secondary">Public</Badge>}
                                {note.tags && JSON.parse(note.tags).slice(0, 2).map((tag: string, idx: number) => (
                                  <Badge key={idx} variant="outline">{tag}</Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTab === "all" || activeTab === "tasks") && searchResults.tasks && searchResults.tasks.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      Tâches ({searchResults.tasks.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.tasks.map((task: any) => (
                        <Link key={task.id} href={`/tasks/${task.id}`}>
                          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                            <CardHeader>
                              <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                              {task.description && (
                                <CardDescription className="line-clamp-2">
                                  {task.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                <Badge variant={task.status === "done" ? "default" : "secondary"}>
                                  {task.status}
                                </Badge>
                                {task.priority && (
                                  <Badge variant="outline">{task.priority}</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTab === "all" || activeTab === "messages") && searchResults.messages && searchResults.messages.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Messages ({searchResults.messages.length})
                    </h2>
                    <div className="space-y-2">
                      {searchResults.messages.map((message: any) => (
                        <Card key={message.id}>
                          <CardContent className="py-4">
                            <p className="text-sm line-clamp-2">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(message.createdAt).toLocaleString("fr-FR")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTab === "all" || activeTab === "events") && searchResults.events && searchResults.events.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Événements ({searchResults.events.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.events.map((event: any) => (
                        <Card key={event.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            {event.description && (
                              <CardDescription className="line-clamp-2">
                                {event.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.startTime).toLocaleString("fr-FR")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {(activeTab === "all" || activeTab === "users") && searchResults.users && searchResults.users.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Utilisateurs ({searchResults.users.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.users.map((user: any) => (
                        <Card key={user.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{user.name}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Badge>{user.role}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {totalResults === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Aucun résultat</p>
                      <p className="text-muted-foreground">
                        Essayez avec d'autres mots-clés
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {searchQuery.length < 2 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Commencez votre recherche</p>
              <p className="text-muted-foreground">
                Entrez au moins 2 caractères pour rechercher
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

