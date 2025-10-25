import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Send, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Chat() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Fetch user's chats
  const { data: chats, isLoading: chatsLoading, refetch: refetchChats } = trpc.chats.list.useQuery();
  
  // Fetch all users for member selection
  const { data: allUsers } = trpc.users.list.useQuery({ orgId: 1 });
  
  // Fetch messages for selected chat with auto-refresh every 3 seconds
  const { data: messages, refetch: refetchMessages } = trpc.chats.getMessages.useQuery(
    { chatId: selectedChatId! },
    { 
      enabled: !!selectedChatId,
      refetchInterval: 3000, // Refresh every 3 seconds
    }
  );

  // Fetch chat members
  const { data: chatMembers } = trpc.chats.getMembers.useQuery(
    { chatId: selectedChatId! },
    { enabled: !!selectedChatId }
  );

  const sendMessageMutation = trpc.chats.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
    },
  });

  const createChatMutation = trpc.chats.create.useMutation({
    onSuccess: (data) => {
      setIsCreateDialogOpen(false);
      setNewChatName("");
      setIsGroupChat(false);
      setSelectedMembers([]);
      refetchChats();
      if (data.chatId) {
        setSelectedChatId(data.chatId);
      }
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChatId) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      body: messageText,
    });
  };

  const handleCreateChat = () => {
    if (isGroupChat && !newChatName.trim()) return;
    if (selectedMembers.length === 0) return;

    createChatMutation.mutate({
      orgId: 1, // TODO: Get from org context
      name: isGroupChat ? newChatName : undefined,
      isGroup: isGroupChat,
      memberIds: selectedMembers,
    });
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectedChat = chats?.find(c => c.chat.id === selectedChatId);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Chat</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isGroup"
                    checked={isGroupChat}
                    onCheckedChange={(checked) => setIsGroupChat(checked as boolean)}
                  />
                  <Label htmlFor="isGroup">Conversation de groupe</Label>
                </div>

                {isGroupChat && (
                  <div>
                    <Label htmlFor="chatName">Nom du groupe</Label>
                    <Input
                      id="chatName"
                      placeholder="Mon équipe..."
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label>Sélectionner les membres</Label>
                  <ScrollArea className="h-48 border rounded-md p-2 mt-2">
                    {allUsers?.filter(u => u.user.id !== user?.id).map((u) => (
                      <div key={u.user.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id={`user-${u.user.id}`}
                          checked={selectedMembers.includes(u.user.id)}
                          onCheckedChange={() => toggleMember(u.user.id)}
                        />
                        <Label htmlFor={`user-${u.user.id}`} className="cursor-pointer">
                          {u.user.name} ({u.user.email})
                        </Label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateChat}
                    disabled={createChatMutation.isPending || selectedMembers.length === 0}
                  >
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-12 gap-4 h-[calc(100%-4rem)]">
          {/* Chat list sidebar */}
          <Card className="col-span-12 md:col-span-4 lg:col-span-3 p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100%-4rem)]">
              <div className="space-y-2">
                {chatsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chargement...
                  </p>
                ) : chats && chats.length > 0 ? (
                  chats.map(({ chat, member }) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedChatId === chat.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {chat.isGroup ? (
                            <Users className="w-5 h-5" />
                          ) : (
                            <MessageSquare className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {chat.name || "Conversation"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {chat.isGroup ? "Groupe" : "Direct"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucune conversation
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat messages area */}
          <Card className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col">
            {selectedChatId ? (
              <>
                {/* Chat header */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">
                        {selectedChat?.chat.name || "Conversation"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {chatMembers?.length || 0} membre(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages && messages.length > 0 ? (
                      messages.map(({ message, sender }) => {
                        const isOwn = sender.id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] ${
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent"
                              } rounded-lg p-3`}
                            >
                              {!isOwn && (
                                <p className="text-xs font-medium mb-1">
                                  {sender.name}
                                </p>
                              )}
                              <p className="text-sm">{message.body}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          Aucun message pour le moment
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tapez votre message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Sélectionnez une conversation pour commencer
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

