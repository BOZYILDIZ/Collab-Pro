import { drizzle } from "drizzle-orm/mysql2";
import { noteTemplates } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const templates = [
  {
    name: "Réunion",
    description: "Template pour prendre des notes de réunion",
    category: "Travail",
    icon: "📝",
    contentMarkdown: `# Réunion - [Titre]

**Date:** ${new Date().toLocaleDateString("fr-FR")}
**Participants:** 
- 
- 

## Ordre du jour
1. 
2. 
3. 

## Notes
### Point 1


### Point 2


## Actions à suivre
- [ ] Action 1 - @responsable
- [ ] Action 2 - @responsable

## Prochaine réunion
**Date:** 
**Sujet:** 
`,
    isPublic: true,
  },
  {
    name: "Projet",
    description: "Template pour planifier un projet",
    category: "Travail",
    icon: "🚀",
    contentMarkdown: `# Projet - [Nom du projet]

## Vue d'ensemble
**Objectif:** 
**Deadline:** 
**Budget:** 
**Équipe:** 

## Contexte


## Objectifs
1. 
2. 
3. 

## Livrables
- [ ] Livrable 1
- [ ] Livrable 2
- [ ] Livrable 3

## Risques identifiés
| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
|        |        |             |            |

## Timeline
- **Phase 1:** 
- **Phase 2:** 
- **Phase 3:** 

## Ressources nécessaires
- 
- 

## Notes
`,
    isPublic: true,
  },
  {
    name: "Brainstorming",
    description: "Template pour sessions de brainstorming",
    category: "Créativité",
    icon: "💡",
    contentMarkdown: `# Brainstorming - [Sujet]

**Date:** ${new Date().toLocaleDateString("fr-FR")}
**Participants:** 
**Durée:** 

## Problématique


## Règles
- Toutes les idées sont bonnes
- Pas de jugement
- Quantité avant qualité
- Rebondir sur les idées des autres

## Idées
### Catégorie 1
- 
- 
- 

### Catégorie 2
- 
- 
- 

### Catégorie 3
- 
- 
- 

## Idées retenues
1. **Idée 1:** 
   - Avantages: 
   - Inconvénients: 

2. **Idée 2:** 
   - Avantages: 
   - Inconvénients: 

## Prochaines étapes
- [ ] 
- [ ] 
`,
    isPublic: true,
  },
  {
    name: "Rapport de bug",
    description: "Template pour documenter un bug",
    category: "Technique",
    icon: "🐛",
    contentMarkdown: `# Bug Report - [Titre court]

## Informations
**Priorité:** 🔴 Critique / 🟠 Haute / 🟡 Moyenne / 🟢 Basse
**Statut:** Nouveau
**Environnement:** Production / Staging / Dev
**Navigateur:** 
**Version:** 

## Description


## Étapes pour reproduire
1. 
2. 
3. 

## Résultat attendu


## Résultat observé


## Captures d'écran


## Logs / Messages d'erreur
\`\`\`
\`\`\`

## Impact
- Utilisateurs affectés: 
- Fonctionnalités bloquées: 

## Solution proposée


## Notes additionnelles
`,
    isPublic: true,
  },
  {
    name: "Documentation technique",
    description: "Template pour documentation de code",
    category: "Technique",
    icon: "📚",
    contentMarkdown: `# Documentation - [Nom du module]

## Vue d'ensemble


## Installation
\`\`\`bash
npm install
\`\`\`

## Configuration
\`\`\`javascript
// config.js
\`\`\`

## Utilisation
### Exemple basique
\`\`\`javascript
// exemple
\`\`\`

### Exemple avancé
\`\`\`javascript
// exemple avancé
\`\`\`

## API Reference
### Fonction 1
**Signature:** \`fonction(param1, param2)\`
**Description:** 
**Paramètres:**
- \`param1\` (type): description
- \`param2\` (type): description
**Retour:** type - description

### Fonction 2
**Signature:** \`fonction(param1, param2)\`
**Description:** 
**Paramètres:**
- \`param1\` (type): description
- \`param2\` (type): description
**Retour:** type - description

## Dépendances
- 
- 

## Tests
\`\`\`bash
npm test
\`\`\`

## Contribution


## License
`,
    isPublic: true,
  },
  {
    name: "Objectifs personnels",
    description: "Template pour définir des objectifs",
    category: "Personnel",
    icon: "🎯",
    contentMarkdown: `# Objectifs - [Période]

## Vision


## Objectifs principaux
### Objectif 1: 
**Échéance:** 
**Pourquoi:** 
**Actions:**
- [ ] 
- [ ] 
- [ ] 

### Objectif 2: 
**Échéance:** 
**Pourquoi:** 
**Actions:**
- [ ] 
- [ ] 
- [ ] 

### Objectif 3: 
**Échéance:** 
**Pourquoi:** 
**Actions:**
- [ ] 
- [ ] 
- [ ] 

## Métriques de succès
| Objectif | Métrique | Cible | Actuel |
|----------|----------|-------|--------|
|          |          |       |        |

## Obstacles potentiels
- 
- 

## Ressources nécessaires
- 
- 

## Révision
**Fréquence:** Hebdomadaire / Mensuelle
**Prochaine révision:** 
`,
    isPublic: true,
  },
];

async function seedTemplates() {
  console.log("🌱 Seeding note templates...");
  
  for (const template of templates) {
    try {
      await db.insert(noteTemplates).values(template);
      console.log(`✅ Created template: ${template.name}`);
    } catch (error) {
      console.error(`❌ Error creating template ${template.name}:`, error);
    }
  }
  
  console.log("✅ Templates seeded successfully!");
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error("❌ Error seeding templates:", error);
  process.exit(1);
});

