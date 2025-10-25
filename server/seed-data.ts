/**
 * Script pour initialiser des données de test dans la base de données
 * 
 * Ce script utilise l'utilisateur actuellement connecté et crée :
 * - Des équipes
 * - Des projets avec des tâches
 * - Des notes
 * - Des événements de calendrier
 * - Des messages de chat
 * 
 * Usage: Exécuter via une route API ou directement
 */

import * as db from './db';

export async function seedDataForUser(userId: number, orgId: number) {
  console.log(`🌱 Début de l'initialisation des données pour l'utilisateur ${userId}...`);

  try {
    // 1. Créer des équipes
    console.log('🏢 Création des équipes...');
    const devTeamId = await db.createTeam({
      orgId,
      name: 'Développement',
      description: 'Équipe de développement logiciel',
      color: '#3B82F6',
      createdBy: userId,
    });
    console.log(`  ✅ Équipe Développement créée (ID: ${devTeamId})`);

    const marketingTeamId = await db.createTeam({
      orgId,
      name: 'Marketing',
      description: 'Équipe marketing et communication',
      color: '#10B981',
      createdBy: userId,
    });
    console.log(`  ✅ Équipe Marketing créée (ID: ${marketingTeamId})`);

    // Ajouter l'utilisateur aux équipes
    await db.addTeamMember(devTeamId!, userId, 'leader');
    await db.addTeamMember(marketingTeamId!, userId, 'leader');
    console.log('  ✅ Utilisateur ajouté aux équipes');

    // 2. Créer des projets
    console.log('📁 Création des projets...');
    const projectId = await db.createProject({
      orgId,
      name: 'Plateforme Collaborative',
      description: 'Développement de la plateforme collaborative',
      status: 'active',
      startDate: new Date(),
      ownerId: userId,
    });
    console.log(`  ✅ Projet créé (ID: ${projectId})`);

    // 3. Créer des tâches
    console.log('✅ Création des tâches...');
    const taskTitles = [
      'Implémenter le système d\'authentification',
      'Créer l\'interface du tableau de bord',
      'Configurer la base de données',
      'Rédiger la documentation',
      'Tester les fonctionnalités',
    ];

    for (const title of taskTitles) {
      await db.createTask({
        projectId: projectId!,
        title,
        description: `Description de la tâche: ${title}`,
        status: 'todo',
        priority: 'medium',
        reporterId: userId,
        assigneeId: userId,
      });
    }
    console.log(`  ✅ ${taskTitles.length} tâches créées`);

    // 4. Créer des notes
    console.log('📝 Création des notes...');
    const noteTitles = [
      'Réunion hebdomadaire',
      'Idées pour la nouvelle fonctionnalité',
      'Notes de formation',
      'Compte rendu réunion client',
      'Plan de développement Q1',
    ];

    for (const title of noteTitles) {
      await db.createNote({
        orgId,
        ownerId: userId,
        title,
        contentMarkdown: `# ${title}\n\nCeci est un exemple de note avec du contenu.\n\n## Points importants\n\n- Point 1\n- Point 2\n- Point 3`,
        isPublic: false,
      });
    }
    console.log(`  ✅ ${noteTitles.length} notes créées`);

    // 5. Créer un calendrier et des événements
    console.log('📅 Création du calendrier et des événements...');
    const calendarId = await db.createCalendar({
      orgId,
      ownerId: userId,
      name: 'Mon Calendrier',
      visibility: 'private',
      color: '#3B82F6',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    await db.createEvent({
      calendarId: calendarId!,
      title: 'Réunion d\'équipe',
      description: 'Réunion hebdomadaire de l\'équipe',
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 heure
      location: 'Salle de réunion A',
      createdBy: userId,
    });

    await db.createEvent({
      calendarId: calendarId!,
      title: 'Sprint Planning',
      description: 'Planification du prochain sprint',
      startsAt: nextWeek,
      endsAt: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000), // 2 heures
      location: 'Bureau',
      createdBy: userId,
    });
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(15, 0, 0, 0);
    
    await db.createEvent({
      calendarId: calendarId!,
      title: 'Revue de code',
      description: 'Revue de code hebdomadaire',
      startsAt: dayAfterTomorrow,
      endsAt: new Date(dayAfterTomorrow.getTime() + 90 * 60 * 1000), // 1.5 heures
      location: 'En ligne',
      createdBy: userId,
    });
    console.log('  ✅ Calendrier et 3 événements créés');

    // 6. Créer un chat d'équipe
    console.log('💬 Création du chat d\'équipe...');
    const chatId = await db.createChat({
      orgId,
      isGroup: true,
      name: 'Équipe Dev',
      createdBy: userId,
    });

    // Ajouter l'utilisateur au chat
    await db.addChatMember({ chatId: chatId!, userId });

    // Créer quelques messages
    await db.createMessage({
      chatId: chatId!,
      senderId: userId,
      body: 'Bonjour à tous ! Bienvenue dans le chat de l\'équipe.',
    });

    await db.createMessage({
      chatId: chatId!,
      senderId: userId,
      body: 'N\'hésitez pas à partager vos idées et questions ici.',
    });
    
    await db.createMessage({
      chatId: chatId!,
      senderId: userId,
      body: 'Bonne journée à tous ! 🚀',
    });
    console.log('  ✅ Chat et 3 messages créés');

    console.log('\n✨ Initialisation des données terminée avec succès !');
    console.log('\n📊 Résumé :');
    console.log(`  - 2 équipes`);
    console.log(`  - 1 projet avec ${taskTitles.length} tâches`);
    console.log(`  - ${noteTitles.length} notes`);
    console.log(`  - 1 calendrier avec 3 événements`);
    console.log(`  - 1 chat avec 3 messages`);

    return {
      success: true,
      data: {
        teams: [devTeamId, marketingTeamId],
        project: projectId,
        tasksCount: taskTitles.length,
        notesCount: noteTitles.length,
        calendar: calendarId,
        eventsCount: 3,
        chat: chatId,
        messagesCount: 3,
      }
    };

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des données:', error);
    throw error;
  }
}

