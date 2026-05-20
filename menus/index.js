// Tous les menus et constantes centralisés — V2

const MENU_PRINCIPAL = `👋 Bienvenue chez *Le Partenaire des Éleveurs* 🐔
Votre assistant avicole en Côte d'Ivoire 🇨🇮

💡 *Que voulez-vous faire aujourd'hui ?*

1️⃣ Démarrer un projet d'élevage
2️⃣ Acheter des poussins
3️⃣ Acheter du matériel d'élevage
4️⃣ Estimer mes coûts & bénéfices
5️⃣ Me former en aviculture
6️⃣ Conseil sanitaire
7️⃣ Suivre mon élevage
8️⃣ 🌐 Acheter • Vendre • Recruter • Techniciens
9️⃣ Contacter le Partenaire des Éleveurs`;

const MENU_RACES = `🐥 *CHOISISSEZ LA RACE DE POUSSINS*
_Le Partenaire des Éleveurs_

1️⃣ Chairs Blanc → 650 FCFA/unité
2️⃣ Chairs Roux → 600 FCFA/unité
3️⃣ Hybrides → 450 FCFA/unité
4️⃣ Pintadeaux Galor → 1 100 FCFA/unité
5️⃣ Pontes ISA Brown → 1 150 FCFA/unité
6️⃣ Bleu Hollande → 400 FCFA/unité
7️⃣ Coquelet Blanc → 150 FCFA/unité
8️⃣ Pintadeaux Hybrides → 900 FCFA/unité

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;

const MENU_MATERIELS_CHOIX = `🏪 *QUE RECHERCHEZ-VOUS ?*
_Le Partenaire des Éleveurs_

1️⃣ Abreuvoirs
2️⃣ Mangeoires
3️⃣ Chauffage
4️⃣ Pack complet (tout)

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;

const MENU_ESTIMATION = `📊 *ESTIMER MES COÛTS & BÉNÉFICES*
_Le Partenaire des Éleveurs_

Quel type de production souhaitez-vous estimer ?

1️⃣ Poulets de chair
2️⃣ Poules pondeuses
3️⃣ Pintades

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;

const MENU_FORMATION = `🎓 *NOS FORMATIONS EN AVICULTURE*
_Le Partenaire des Éleveurs_

Choisissez votre type de formation :

1️⃣ *Formation LIVE — Zoom*
📅 Chaque mois (vendredis & dimanches)
💰 85 000 FCFA
👥 En direct avec nos experts

2️⃣ *Formation PRÉ-ENREGISTRÉE*
⏱️ À votre rythme, 24h/24
💰 27 500 FCFA
📱 Accès immédiat

Tapez *1* ou *2* pour choisir
↩️ Tapez *menu* pour annuler`;

const MENU_SANTE = `🩺 *CONSEIL SANITAIRE*
_Le Partenaire des Éleveurs_

Quel problème observez-vous ?

1️⃣ Mortalités élevées
2️⃣ Diarrhée / selles anormales
3️⃣ Toux / difficultés respiratoires
4️⃣ Poulets faibles ou abattus
5️⃣ Mauvaise croissance
6️⃣ Problème d'alimentation
7️⃣ Autre symptôme (décrivez librement)

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour revenir au menu principal`;

const MENU_BANDE = `📊 *SUIVI DE MON ÉLEVAGE*
_Le Partenaire des Éleveurs_

Que voulez-vous faire ?

1️⃣ Enregistrer une nouvelle bande
2️⃣ Voir l'état de ma bande actuelle
3️⃣ Signaler un problème sanitaire

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour revenir au menu principal`;

const MENU_CONSEILLER = `📞 *CONTACTEZ LE PARTENAIRE DES ÉLEVEURS*

👤 *Responsable*
📲 (+225) 01 53 21 74 42

🏪 *Magasin Yopougon*
📲 (+225) 07 06 16 24 19

🏪 *Magasin Abobo N'Dotré*
📲 (+225) 05 06 15 87 97

↩️ Tapez *menu* pour revenir au menu principal`;

const MESSAGE_INCONNU = `❓ Je n'ai pas compris votre message.

Tapez un numéro pour choisir une option ou posez-moi une question directement.

↩️ Tapez *menu* pour voir le menu principal`;

// Bloc AKOGOUA inséré en fin de certaines conversations
const AKOGOUA_CTA = `\n\n🌐 *Rejoignez la communauté avicole :* akogoua.com
_Acheter • Vendre • Recruter • Trouver un technicien_`;

const PRIX_POUSSINS = {
  '1': { race: 'Chairs Blanc',        prix: 650  },
  '2': { race: 'Chairs Roux',         prix: 600  },
  '3': { race: 'Hybrides',            prix: 450  },
  '4': { race: 'Pintadeaux Galor',    prix: 1100 },
  '5': { race: 'Pontes ISA Brown',    prix: 1150 },
  '6': { race: 'Bleu Hollande',       prix: 400  },
  '7': { race: 'Coquelet Blanc',      prix: 150  },
  '8': { race: 'Pintadeaux Hybrides', prix: 900  },
};

module.exports = {
  MENU_PRINCIPAL, MENU_RACES, MENU_MATERIELS_CHOIX, MENU_ESTIMATION,
  MENU_FORMATION, MENU_SANTE, MENU_BANDE, MENU_CONSEILLER,
  MESSAGE_INCONNU, AKOGOUA_CTA, PRIX_POUSSINS,
};
