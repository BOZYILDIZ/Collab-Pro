import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Starting database seeding...");

  try {
    // Create demo organization
    console.log("Creating organization...");
    const [orgResult] = await db.insert(schema.organizations).values({
      name: "DemoCorp",
      slug: "democorp",
      logoUrl: null,
      settingsJson: JSON.stringify({ theme: "light" }),
    });
    const orgId = Number(orgResult.insertId);
    console.log(`✓ Organization created with ID: ${orgId}`);

    // Create demo users
    console.log("Creating users...");
    const users = [
      { openId: "owner-001", name: "Alice Martin", email: "alice@democorp.fr", role: "owner" as const },
      { openId: "admin-001", name: "Bob Dupont", email: "bob@democorp.fr", role: "admin" as const },
      { openId: "admin-002", name: "Claire Bernard", email: "claire@democorp.fr", role: "admin" as const },
      { openId: "member-001", name: "David Rousseau", email: "david@democorp.fr", role: "member" as const },
      { openId: "member-002", name: "Emma Petit", email: "emma@democorp.fr", role: "member" as const },
      { openId: "member-003", name: "François Moreau", email: "francois@democorp.fr", role: "member" as const },
      { openId: "member-004", name: "Gabrielle Simon", email: "gabrielle@democorp.fr", role: "member" as const },
      { openId: "member-005", name: "Hugo Laurent", email: "hugo@democorp.fr", role: "member" as const },
      { openId: "member-006", name: "Isabelle Michel", email: "isabelle@democorp.fr", role: "member" as const },
      { openId: "guest-001", name: "Jean Invité", email: "jean@external.fr", role: "guest" as const },
    ];

    const userIds: number[] = [];
    for (const user of users) {
      const [result] = await db.insert(schema.users).values({
        openId: user.openId,
        name: user.name,
        email: user.email,
        displayName: user.name,
        role: user.role,
        status: Math.random() > 0.5 ? "online" : "offline",
      });
      userIds.push(Number(result.insertId));
    }
    console.log(`✓ Created ${users.length} users`);

    // Add users to organization
    console.log("Adding users to organization...");
    for (let i = 0; i < userIds.length; i++) {
      await db.insert(schema.orgMemberships).values({
        orgId,
        userId: userIds[i],
        role: users[i].role,
      });
    }
    console.log(`✓ Added ${userIds.length} members to organization`);

    // Create chats
    console.log("Creating chats...");
    const chatIds: number[] = [];
    
    // 2 private chats
    for (let i = 0; i < 2; i++) {
      const [result] = await db.insert(schema.chats).values({
        orgId,
        isGroup: false,
        name: null,
        createdBy: userIds[0],
      });
      const chatId = Number(result.insertId);
      chatIds.push(chatId);
      
      await db.insert(schema.chatMembers).values([
        { chatId, userId: userIds[0] },
        { chatId, userId: userIds[i + 1] },
      ]);
    }

    // 2 group chats
    const groupChats = [
      { name: "Équipe Dev", members: [0, 1, 3, 4, 5] },
      { name: "Direction", members: [0, 1, 2] },
    ];

    for (const group of groupChats) {
      const [result] = await db.insert(schema.chats).values({
        orgId,
        isGroup: true,
        name: group.name,
        createdBy: userIds[0],
      });
      const chatId = Number(result.insertId);
      chatIds.push(chatId);

      for (const memberIdx of group.members) {
        await db.insert(schema.chatMembers).values({
          chatId,
          userId: userIds[memberIdx],
        });
      }
    }
    console.log(`✓ Created ${chatIds.length} chats`);

    // Create messages
    console.log("Creating messages...");
    const messages = [
      { chatId: chatIds[0], senderId: userIds[0], body: "Bonjour ! Comment vas-tu ?" },
      { chatId: chatIds[0], senderId: userIds[1], body: "Très bien merci ! Et toi ?" },
      { chatId: chatIds[2], senderId: userIds[0], body: "Réunion demain à 10h pour le sprint planning" },
      { chatId: chatIds[2], senderId: userIds[3], body: "Parfait, je serai là !" },
      { chatId: chatIds[2], senderId: userIds[4], body: "OK pour moi aussi" },
    ];

    for (const msg of messages) {
      await db.insert(schema.messages).values(msg);
    }
    console.log(`✓ Created ${messages.length} messages`);

    // Create notes
    console.log("Creating notes...");
    const notes = [
      { title: "Compte rendu réunion", content: "# Réunion du 20/01\n\n- Point 1\n- Point 2", isPublic: true, ownerId: userIds[0] },
      { title: "Roadmap Q1", content: "## Objectifs\n\n1. Feature A\n2. Feature B", isPublic: true, ownerId: userIds[1] },
      { title: "Notes personnelles", content: "Mes notes privées", isPublic: false, ownerId: userIds[0] },
      { title: "Todo list", content: "- [ ] Tâche 1\n- [ ] Tâche 2", isPublic: false, ownerId: userIds[3] },
      { title: "Documentation API", content: "# API Endpoints\n\n## Users", isPublic: true, ownerId: userIds[2] },
    ];

    for (const note of notes) {
      await db.insert(schema.notes).values({
        orgId,
        ownerId: note.ownerId,
        title: note.title,
        contentMarkdown: note.content,
        isPublic: note.isPublic,
      });
    }
    console.log(`✓ Created ${notes.length} notes`);

    // Create calendars
    console.log("Creating calendars...");
    const calendarIds: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const [result] = await db.insert(schema.calendars).values({
        orgId,
        ownerId: userIds[i],
        name: i === 0 ? "Mon agenda" : `Agenda ${users[i].name}`,
        visibility: i === 0 ? "public" : "private",
        color: ["#3b82f6", "#10b981", "#f59e0b"][i],
      });
      calendarIds.push(Number(result.insertId));
    }
    console.log(`✓ Created ${calendarIds.length} calendars`);

    // Create events
    console.log("Creating events...");
    const now = new Date();
    const events = [
      {
        calendarId: calendarIds[0],
        title: "Sprint Planning",
        description: "Planification du prochain sprint",
        startsAt: new Date(now.getTime() + 86400000), // Tomorrow
        endsAt: new Date(now.getTime() + 86400000 + 3600000), // Tomorrow + 1h
        createdBy: userIds[0],
      },
      {
        calendarId: calendarIds[0],
        title: "Réunion client",
        description: "Présentation du prototype",
        location: "Salle A",
        startsAt: new Date(now.getTime() + 172800000), // In 2 days
        endsAt: new Date(now.getTime() + 172800000 + 7200000), // In 2 days + 2h
        createdBy: userIds[0],
      },
    ];

    for (const event of events) {
      await db.insert(schema.events).values(event);
    }
    console.log(`✓ Created ${events.length} events`);

    // Create availability slots
    console.log("Creating availability slots...");
    const availabilitySlots = [
      // Monday to Friday, 9am-12pm and 2pm-6pm for user 0
      { userId: userIds[0], dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      { userId: userIds[0], dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
      { userId: userIds[0], dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
      { userId: userIds[0], dayOfWeek: 2, startTime: "14:00", endTime: "18:00" },
      { userId: userIds[0], dayOfWeek: 3, startTime: "09:00", endTime: "12:00" },
      { userId: userIds[0], dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
      { userId: userIds[0], dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
      { userId: userIds[0], dayOfWeek: 4, startTime: "14:00", endTime: "18:00" },
      { userId: userIds[0], dayOfWeek: 5, startTime: "09:00", endTime: "12:00" },
      { userId: userIds[0], dayOfWeek: 5, startTime: "14:00", endTime: "18:00" },
    ];

    for (const slot of availabilitySlots) {
      await db.insert(schema.availabilitySlots).values(slot);
    }
    console.log(`✓ Created ${availabilitySlots.length} availability slots`);

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

