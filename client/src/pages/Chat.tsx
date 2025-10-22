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

export default function Chat() {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's chats
  const { data: chats, isLoading: chatsLoading } = trpc.chats.list.useQuery();
  
  // Fetch messages for selected chat
  const { data: messages, refetch: refetchMessages } = trpc.chats.getMessages.useQuery(
    { chatId: selectedChatId! },
    { enabled: !!selectedChatId }
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

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChatId) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      body: messageText,
    });
  };

  const selectedChat = chats?.find(c => c.chat.id === selectedChatId);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Chat</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle conversation
          </Button>
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

