export type LearningCategory =
  | "water"
  | "filtration"
  | "equipment"
  | "basins"
  | "diagnostic"
  | "organization"
  | "clients"
  | "humor";

export interface LearningPhrase {
  category: LearningCategory;
  text: string;
}

function phrases(category: LearningCategory, entries: readonly string[]): LearningPhrase[] {
  return entries.map((text) => ({ category, text }));
}

const WATER_PHRASES = phrases("water", [
  "Analyse des différents traitements de l’eau…",
  "Mémorisation des valeurs idéales du pH…",
  "Étude du chlore libre…",
  "Analyse du chlore combiné…",
  "Compréhension du chlore total…",
  "Étude du rôle du TAC…",
  "Mémorisation des repères du TH…",
  "Analyse du niveau de stabilisant…",
  "Apprentissage de l’équilibre de l’eau…",
  "Recherche des causes d’une eau verte…",
  "Analyse des origines d’une eau trouble…",
  "Identification des différentes algues…",
  "Étude des traitements choc…",
  "Organisation des traitements préventifs…",
  "Comparaison des traitements curatifs…",
  "Mémorisation des dosages adaptés…",
  "Compréhension des interactions entre les produits…",
  "Analyse des déséquilibres de l’eau…",
  "Étude de l’alcalinité des bassins…",
  "Observation de l’influence de la température…",
  "Analyse de la consommation du désinfectant…",
  "Compréhension de la demande en chlore…",
  "Étude des corrections progressives du pH…",
  "Mémorisation des précautions de dosage…",
  "Analyse de la clarté de l’eau…",
  "Étude des dépôts calcaires…",
  "Compréhension des variations après baignade…",
  "Préparation des contrôles de qualité de l’eau…",
]);

const FILTRATION_PHRASES = phrases("filtration", [
  "Étude des filtres à sable…",
  "Analyse des filtres à cartouche…",
  "Découverte des filtres à diatomées…",
  "Étude du fonctionnement des pompes…",
  "Analyse des débits de filtration…",
  "Apprentissage des cycles de filtration…",
  "Étude approfondie des skimmers…",
  "Analyse des buses de refoulement…",
  "Compréhension des pertes de charge…",
  "Cartographie des circuits hydrauliques…",
  "Étude des bondes de fond…",
  "Analyse du rôle des vannes…",
  "Compréhension du cheminement de l’eau…",
  "Apprentissage des contre-lavages efficaces…",
  "Étude de la pression des filtres…",
  "Analyse des diamètres de canalisation…",
  "Comparaison des médias filtrants…",
  "Organisation des temps de filtration…",
  "Étude des prises balai…",
  "Analyse de l’amorçage des pompes…",
  "Compréhension des entrées d’air hydrauliques…",
  "Étude de la circulation dans le bassin…",
  "Mémorisation des contrôles de filtration…",
  "Optimisation des circuits hydrauliques…",
]);

const EQUIPMENT_PHRASES = phrases("equipment", [
  "Étude des électrolyseurs au sel…",
  "Analyse des pompes à chaleur…",
  "Apprentissage des régulations automatiques…",
  "Étude des robots de piscine…",
  "Analyse des volets roulants…",
  "Étude des systèmes de sécurité…",
  "Analyse des projecteurs immergés…",
  "Compréhension des coffrets électriques…",
  "Découverte des équipements connectés…",
  "Étude des cellules d’électrolyse…",
  "Analyse des sondes de mesure…",
  "Compréhension des doseurs automatiques…",
  "Comparaison des couvertures de bassin…",
  "Étude des alarmes de piscine…",
  "Analyse des systèmes de nage à contre-courant…",
  "Apprentissage des réglages de pompe à chaleur…",
  "Étude de la durée de vie des équipements…",
  "Organisation des contrôles électriques…",
  "Mémorisation des entretiens d’équipements…",
  "Analyse des compatibilités entre appareils…",
]);

const BASIN_PHRASES = phrases("basins", [
  "Apprentissage des différents types de piscines…",
  "Étude des piscines coque…",
  "Analyse des piscines béton…",
  "Étude des piscines avec liner…",
  "Apprentissage des différents revêtements…",
  "Étude des piscines au sel…",
  "Analyse des piscines à débordement…",
  "Étude des bassins miroir…",
  "Comparaison des structures de bassin…",
  "Analyse des membranes armées…",
  "Étude des bassins carrelés…",
  "Compréhension des piscines semi-enterrées…",
  "Analyse des contraintes des petits bassins…",
  "Étude des besoins des grands bassins…",
  "Apprentissage des particularités des spas…",
  "Observation des lignes d’eau…",
  "Étude des escaliers et plages immergées…",
  "Analyse des volumes utiles des bassins…",
]);

const DIAGNOSTIC_PHRASES = phrases("diagnostic", [
  "Analyse des symptômes d’une pompe fatiguée…",
  "Recherche des causes de perte de pression…",
  "Étude des fuites les plus discrètes…",
  "Analyse des problèmes de filtration…",
  "Apprentissage des pannes récurrentes…",
  "Étude des anomalies hydrauliques…",
  "Analyse des problèmes d’électrolyse…",
  "Recherche des causes d’une eau trouble…",
  "Préparation des contrôles préventifs…",
  "Analyse des bruits inhabituels…",
  "Étude des baisses de niveau…",
  "Compréhension des défauts d’amorçage…",
  "Analyse des pressions anormales…",
  "Recherche des défauts de circulation…",
  "Étude des sondes mal étalonnées…",
  "Analyse des déclenchements électriques…",
  "Apprentissage des signes d’usure…",
  "Organisation d’un diagnostic méthodique…",
  "Mise en relation des symptômes et des causes…",
  "Préparation des opérations de maintenance…",
]);

const ORGANIZATION_PHRASES = phrases("organization", [
  "Organisation optimale d’une tournée de piscines…",
  "Création de plannings efficaces…",
  "Optimisation des déplacements…",
  "Apprentissage de la gestion des entretiens récurrents…",
  "Organisation des interventions de la semaine…",
  "Recherche du planning parfait…",
  "Apprentissage de la gestion des urgences…",
  "Optimisation d’une journée de pisciniste…",
  "Organisation d’une semaine de 80 entretiens…",
  "Étude de la meilleure répartition des interventions…",
  "Analyse des priorités de la journée…",
  "Préparation des tournées par secteur…",
  "Organisation du travail des équipes…",
  "Mise en ordre des tâches importantes…",
  "Anticipation des temps de déplacement…",
  "Étude des créneaux d’intervention…",
  "Coordination des passages récurrents…",
  "Préparation d’une journée bien rythmée…",
]);

const CLIENT_PHRASES = phrases("clients", [
  "Apprentissage du suivi client…",
  "Organisation de l’historique des bassins…",
  "Analyse des interventions précédentes…",
  "Mémorisation des équipements de chaque piscine…",
  "Étude du suivi des contrats d’entretien…",
  "Organisation des informations clients…",
  "Préparation du suivi personnalisé des bassins…",
  "Mise en relation des interventions et des équipements…",
  "Analyse des habitudes de chaque bassin…",
  "Structuration des comptes rendus d’entretien…",
  "Étude de la continuité du service…",
  "Organisation des demandes des clients…",
  "Mémorisation des particularités de chaque piscine…",
  "Analyse de la fréquence des interventions…",
  "Préparation des prochains passages…",
  "Compréhension des historiques de maintenance…",
]);

const HUMOR_PHRASES = phrases("humor", [
  "Révision des formules du chlore… encore une fois.",
  "Tentative de comprendre pourquoi cette eau est encore verte…",
  "Recherche du planning parfait… toujours en cours.",
  "Classement mental de quelques milliers de piscines…",
  "Apprentissage de l’art de ne jamais oublier un entretien…",
  "Analyse approfondie des skimmers… vraiment approfondie.",
  "Calcul de quelques milliers de dosages…",
  "Tentative de négociation avec une pompe récalcitrante…",
  "Encore quelques piscines à étudier…",
  "Étude scientifique du fameux « pourtant hier l’eau était parfaite »…",
  "Recherche de la fuite qui jure qu’elle n’existe pas…",
  "Apprentissage de la patience face à une eau verte…",
  "Préparation à vos futurs « LETI, retrouve-moi cette intervention… »",
  "Vérification qu’un lundi peut contenir autant d’entretiens…",
  "Étude très sérieuse de la météo avant une tournée…",
  "Analyse du mystérieux « ça marchait très bien hier »…",
  "Négociation diplomatique avec un filtre bouché…",
  "Recherche de la piscine qui n’a jamais de problème…",
  "Comptage des feuilles tombées juste après le nettoyage…",
  "Enquête sur ce robot qui préfère manifestement les escaliers…",
  "Réflexion intense sur la personnalité des vannes six voies…",
  "Vérification que le chlore n’a pas pris sa journée…",
  "Étude du client qui connaît son pH au regard de l’eau…",
  "Recherche d’une pompe qui s’amorce du premier coup…",
  "Analyse de la piscine parfaite aperçue une fois en 2024…",
  "Préparation mentale à la saison des feuilles…",
  "Tentative de faire entrer huit urgences dans trois créneaux…",
  "Classement des bruits de pompe du rassurant au suspect…",
  "Étude de l’étrange disparition des épuisettes…",
  "Calcul du nombre exact de fois où il faut rincer un filtre…",
  "Observation du skimmer qui attend toujours le vendredi soir…",
  "Recherche d’un bassin qui lit attentivement sa notice…",
  "Analyse du « petit bruit » entendu depuis trois semaines…",
  "Mémorisation de l’endroit où la clé du local a été rangée…",
  "Étude des nuages qui arrivent juste après le traitement…",
  "Vérification qu’une tournée calme existe vraiment…",
]);

/**
 * 180 sujets, dont 144 professionnels et 36 touches d’humour (80/20).
 * L’ordre initial est stable pour éviter toute différence entre le serveur et
 * l’hydratation ; la rotation aléatoire est gérée dans le composant client.
 */
export const LEARNING_PHRASES: readonly LearningPhrase[] = [
  ...WATER_PHRASES,
  ...FILTRATION_PHRASES,
  ...EQUIPMENT_PHRASES,
  ...BASIN_PHRASES,
  ...DIAGNOSTIC_PHRASES,
  ...ORGANIZATION_PHRASES,
  ...CLIENT_PHRASES,
  ...HUMOR_PHRASES,
];
