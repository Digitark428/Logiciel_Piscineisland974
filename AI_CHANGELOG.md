# AI_CHANGELOG.md — Transmissions Codex ↔ Claude Code

> Ajouter une entrée courte après chaque intervention significative. Ne pas y dupliquer la documentation durable de `PROJECT_CONTEXT.md`.

## 2026-08-26 — Codex — Nettoyage de marque et adresse publique LETI

- **Identité installable :** paquet renommé `leti-app`, manifeste stabilisé avec l'identifiant `/app`, métadonnées Apple/HTML conservées sous LETI et URL canonique de l'accueil fixée à `https://leti-app-reunion.vercel.app`.
- **Infrastructure Vercel :** même projet de production renommé `leti-app-reunion`, variable `NEXT_PUBLIC_APP_URL` alignée en Production et Preview, et quatre variables obsolètes de l'ancien mode démo supprimées.
- **Documentation :** titres, descriptions, bootstrap et mémoire commune utilisent LETI ; seuls les identifiants historiques GitHub/Supabase et les migrations immuables conservent l'ancien nom à titre technique.
- **Vérification :** lint sans erreur, typecheck valide, build de production réussi et 58 tests unitaires validés ; 19 tests d'intégration conditionnels aux secrets locaux ignorés.

## 2026-08-26 — Codex — Icône mobile et installation PWA LETI

- **Icônes :** nouvelle déclinaison 180, 192 et 512 px composée exclusivement avec le symbole officiel LETI, agrandi et centré sur le blanc cassé de la marque ; les fichiers finaux sont opaques pour éviter le fond noir appliqué par iOS aux transparences.
- **Installation :** manifeste PWA avec nom LETI, lancement autonome sur `/app`, couleurs de marque et icônes haute définition ; métadonnées Apple explicites pour l’ajout à l’écran d’accueil.
- **Périmètre :** aucune logique métier, donnée, route applicative ou permission modifiée.
- **Vérification :** lint, typecheck, build de production et 58 tests unitaires validés ; manifeste statique généré avec les deux icônes PWA attendues.

## 2026-08-26 — Codex — Expérience d’apprentissage LETI IA

- **Parcours :** l’entrée existante LETI IA reste marquée « En développement » mais devient cliquable, active sur sa route et ouvre uniquement `/app/leti-ia` dans le shell et le fondu de navigation existants.
- **Expérience :** pictogramme officiel seul, composition blanche immersive, particules aqua/corail absorbées, filaments et mini-constellations Canvas, respiration discrète, phrase permanente, capsule et message de confiance ; aucune bibliothèque d’animation ajoutée.
- **Contenu et accessibilité :** 180 sujets uniques répartis à 80 % métier et 20 % humour, rotation sans répétition récente, variations visuelles par catégorie, rendu responsive et constellation statique avec `prefers-reduced-motion`.
- **Vérification :** lint, typecheck, build de production et 58 tests unitaires validés ; 19 tests d’intégration conditionnels ignorés. Contrôles navigateur à 375, 430, 768, 1280 et 1440 px sans débordement, erreur ni fuite visible ; production Vercel `READY` vérifiée.

## 2026-08-26 — Codex — Retour au fondu de navigation

- **Transition :** suppression complète du glissement horizontal, du calcul avant/arrière, des distances CSS et des attributs directionnels. Toutes les vues `/app` utilisent désormais un fondu global court de 120 à 160 ms, sans déplacement du contenu ni du lien actif.
- **Conservé :** shell fixe, feedback immédiat, préchargement sur intention, déduplication des clics, skeleton après 300 ms et neutralisation via `prefers-reduced-motion`.
- **Traçabilité :** standard durable mis à jour dans `AGENTS.md`, `PROJECT_CONTEXT.md` et `DECISIONS.md` afin que les futures pages restent sur ce fondu simple.
- **Vérification :** typecheck, lint, build de production et 55 tests unitaires validés ; 19 tests d'intégration conditionnels aux secrets locaux ignorés.

## 2026-08-25 — Codex — Navigation directionnelle et préchargement maîtrisé

- **Transitions :** ordre logique global des écrans principaux et des sous-menus, ouverture d'une fiche vers l'avant et retour vers l'arrière ; mouvement horizontal discret limité au contenu, shell fixe, retour immédiat au clic et neutralisation complète avec `prefers-reduced-motion`.
- **Chargement :** préchargement automatique retiré des listes denses et remplacé par une intention explicite (survol, focus, toucher), avec déduplication des doubles clics et des destinations déjà en cours.
- **Audit :** base minuscule et requêtes Supabase principales à environ 1–3 ms ; la latence froide observée vient surtout du rendu serveur authentifié et du réseau. La validation distante `getUser` reste conservée pour la révocation immédiate des sessions.
- **Vérification :** lint, typecheck, build de production et 60 tests unitaires validés ; publication directe Vercel en production. La sonde de mesure temporaire a été retirée du livrable final.

## 2026-08-25 — Codex — Finition visuelle stricte LETI

- **Fondations :** cartes désormais pleines et calmes, bordures plus fines, ombres raccourcies, gradients décoratifs retirés, CTA corail affirmé, contrôles à 44 px et focus aqua cohérent ; les rayons et la typographie existants sont conservés.
- **Écrans :** shell, dashboard, Mes entretiens, planning, tâches, piscines, équipe, carte et assistance reçoivent uniquement des ajustements de surfaces, états actifs et micro-interactions. Aucun texte, contenu, ordre, route, permission, action ou comportement métier n'a changé.
- **Vérification :** diff TSX limité aux classes visuelles, lint et typecheck validés, build de production réussi, 58 tests unitaires validés et 19 tests d'intégration conditionnels ignorés. Accueil et connexion contrôlés à 375, 768 et 1440 px sans débordement ; les écrans privés restent contrôlés statiquement faute de session navigateur authentifiée.

## 2026-08-25 — Codex — UX compacte, planning personnel et modales accessibles

- **Profil et entretiens :** « Gestion » démarre fermé à chaque ouverture du menu profil ; la vue des entretiens reçoit un en-tête, des actions, des cartes et une barre semaine plus compacts, avec recherche/filtres dans un panneau dédié responsive.
- **Planning :** entretiens, tâches datées en lecture seule et événements personnels peuvent être filtrés et affichés en jour/semaine/mois/année. Les événements disposent d'un CRUD dans une modale accessible ; Chantiers et Dépannages restent désactivés et annoncés « Bientôt ».
- **Galerie et assistance :** lightbox sombre sans panneau blanc, images optimisées, fermeture hors zone/Échap et verrouillage du défilement ; « Aide & retours » devient un vrai dialogue mobile avec flou activé par défaut, bouton de désactivation, fil défilant et saisie toujours accessible. L'assistance du portail client reçoit aussi Échap, piège/restauration du focus et boutons tactiles explicites.
- **Base et sécurité :** migrations `personal_planning_events` et `planning_events_grant_hardening` appliquées en production (dernier ledger `20260825064057`). La table est isolée par workspace et propriétaire, RLS owner-only même face au gérant, garde inter-tenant, aucun droit anon et strict CRUD authentifié ; les advisors ne signalent aucune alerte de sécurité liée.
- **Vérification :** lint, typecheck, build et 58 tests unitaires validés. Les 19 tests d'intégration conditionnels aux secrets locaux sont ignorés ; leurs scénarios critiques ont été reproduits avec succès dans une transaction de production annulée, sans donnée de test persistée.

## 2026-08-24 — Codex — Menu du profil et navigation allégée

- **En-tête :** le bloc utilisateur ouvre désormais un menu accessible réunissant la modification du profil, « Gestion » et « Paramètres » selon les droits déjà en place.
- **Barre latérale :** « Gestion » et « Paramètres » en sont retirés sans modifier leurs routes ni leurs permissions ; Documents, Équipe, Sauvegardes et Journal restent filtrés individuellement.
- **Hiérarchie et fluidité :** les sous-menus ouverts utilisent un fond gris discret ; le menu se ferme après navigation, au clic extérieur et avec Échap, tout en héritant du préchargement et des transitions adaptatives globales.

## 2026-08-24 — Codex — Transitions adaptatives permanentes

- **Architecture :** wrapper global sous `/app`, shell persistant et interception des liens internes pour un feedback immédiat ; direction fiable liste ↔ fiche, changements ambigus neutres et durée d'entrée adaptée au temps réellement mesuré, sans attente forcée ni dépendance ajoutée.
- **Latence et accessibilité :** suppression du fallback de route immédiat susceptible de flasher ; la vue courante reste visible et un skeleton stable ne se révèle qu'après 300 ms. Animations limitées à `opacity`/`transform`, neutralisées avec `prefers-reduced-motion` et compatibles avec les futures routes.
- **Standard permanent :** règle inscrite dans `AGENTS.md`, `PROJECT_CONTEXT.md` et `DECISIONS.md` ; tests unitaires ajoutés pour les directions client/entretien et les changements de paramètres.

## 2026-08-23 — Codex — Mise à jour fonctionnelle et ergonomique LETI

- **Pilotage et entretiens :** tableau de bord recentré sur les passages du jour, nom opérationnel `Prénom NOM`, cartes avec identité du technicien et statut renforcé ; vue Services harmonisée et Planning limité à Entretien avec Chantier/Dépannage annoncés en développement.
- **Tâches & Notes :** séparation en trois routes personnelles, attribuées et notes. La to-do privée reçoit priorité obligatoire, date/heure facultatives, groupes repliables et tri ouvert/échéance ; les tâches attribuées affichent photo, nom et fonction. Les échanges de notes sont désormais inline et chargés à la demande.
- **Communauté, carte et navigation :** hashtags cliquables, recherche serveur par contenu/auteur, galerie privée paginée sans duplication avec lightbox ; repères cartographiques par photo/initiales et piles multi-intervenants ; menus repliables « Tâches & Notes » et « Gestion », plus les quatre fonctions futures avant Paramètres.
- **Base et sécurité :** migrations `task_priorities_and_due_time` et `task_creator_index_order` appliquées en production (dernier ledger `20260823183746`). Les 2 tâches existantes sont conservées en `not_urgent`, le trigger inter-tenant est `SECURITY DEFINER` à `search_path` fixé et non exécutable par l'API ; test live RLS à zéro ligne étrangère/personnelle et advisor Tâches sans alerte.
- **Vérification :** typecheck, lint, build de production et 50 tests unitaires validés ; 18 tests d'intégration restent conditionnels aux secrets locaux. La session navigateur disponible n'était pas authentifiée pour inspecter les écrans privés avant publication.

## 2026-08-23 — Codex — Contrats d'entretien hebdomadaires paresseux

- **Métier :** « Mes entretiens » devient une vraie vue semaine sans limite de navigation, avec création distincte d'un contrat hebdomadaire ou d'un entretien ponctuel. Le contrat ne demande ni piscine, ni heure, ni durée ; les statuts, commentaires, comptes-rendus et déplacements restent propres à chaque passage.
- **Architecture :** les contrats `weekly_contract` vivent dans `service_series` et leurs occurrences sont calculées à la lecture pour la période demandée. Une ligne `services` est matérialisée uniquement lors d'une interaction ; `occurrence_date` garde la date nominale et `scheduled_date` l'éventuelle exception. Les anciennes séries restent `legacy` et leurs 8 passages de production n'ont pas été réécrits.
- **Écrans liés :** planning, carte quotidienne, dashboard financier, recherche/filtres, fiche client, portail, sauvegardes, notifications et Super Admin utilisent le nouveau modèle. Les montants mensuels restent dans `service_financials`, invisibles aux techniciens.
- **Sécurité :** migrations `weekly_maintenance_contracts`, `allow_assigned_occurrence_comments`, `fix_service_completion_guard_invoker_detection` et `lock_recurring_occurrence_identity` appliquées en production (dernier ledger `20260823074205`). Le technicien assigné peut commenter et réaliser son passage, mais pas modifier le planning ou l'identité nominale ; les fonctions de garde ne sont pas exécutables par API.
- **Vérification :** lint, typecheck, build et 40 tests unitaires validés. Des transactions de production annulées ont vérifié les contraintes de récurrence, l'unicité, la finance mensuelle sans occurrence et le garde-fou technicien ; les compteurs métier sont restés inchangés.

## 2026-08-23 — Codex — Audit et optimisations de performance LETI

- **P0 :** préparation de l'exécution Vercel à Paris (`cdg1`) au plus près de Supabase `eu-west-3` ; le middleware valide désormais les JWT ES256 localement avec `getClaims`, tandis qu'une unique vérification distante `getUser` reste conservée côté serveur pour détecter immédiatement une session révoquée.
- **Navigation et données :** prefetch sur intention desktop et tactile mobile avec expiration, requêtes indépendantes des fiches client/entretien parallélisées, sélections Supabase resserrées et URLs Storage de consultation signées en lot.
- **Interactions :** cases des tâches générales et d'entretien mises à jour immédiatement, avec rollback et message en cas d'échec serveur.
- **RLS :** migration non destructive `20260823062839_optimize_rls_auth_initplans` appliquée en production (ledger Supabase `20260823063815`) pour évaluer `auth.uid()` une fois par requête dans 14 policies, sans changer leurs rôles ni prédicats métier ; l'advisor `auth_rls_initplan` est revenu à zéro.
- **Vérification :** lint, typecheck, build et 35 tests validés ; accueil, connexion et redirection privée contrôlés à 375 px et 1440 px sans débordement, overlay ni erreur console avec la configuration Supabase publique. Les advisors après migration ne remontent aucune nouvelle alerte ; la publication est déclenchée par le push de ce changement sur la branche de production.

## 2026-08-20 — Codex — Correctifs ciblés logo, menu et notifications

- **Accueil :** le conteneur vertical du logo centre désormais explicitement le sigle officiel sur l’axe réel du mot-symbole ; contrôle navigateur mesuré à 0 px d’écart aux formats desktop et mobile.
- **Menu et notifications :** les entrées Mes chantiers, Comptabilité et LETI IA reprennent un fond neutre avec la couleur réservée aux seuls badges ; le pulse de notification est limité à la bulle de cloche, actif uniquement si le compteur est non nul et désactivé avec `prefers-reduced-motion`.
- **Vérification :** lint, typecheck, build et 35 tests unitaires validés ; accueil contrôlé localement à 1440 px et 375 px sans débordement ni erreur console.

## 2026-08-20 — Codex — Finitions visuelles premium LETI

- **Design System :** ajout de tokens pastel centralisés (corail/aqua, surfaces glass, bordures et ombres) et de variantes partagées pour les cards, boutons, badges, états « En développement » et micro-animations compatibles avec `prefers-reduced-motion`.
- **Accueil et dashboard :** logo officiel composé verticalement, ombre diffuse du sigle, card de promesse avec flare discret et cards de tableau de bord plus légères ; aucun changement de route, données, actions ou autorisations.
- **Shell et communauté :** sigle animé subtilement dans la sidebar, code entreprise copiable, annonces Mes chantiers / Comptabilité / LETI IA, launcher d'assistance pastel, pulse de notification conditionnel ; « Entre nous » reçoit un en-tête identité-rôle-date compact et des médias conservant leur ratio naturel.
- **Vérification :** lint, typecheck, build et 35 tests unitaires validés ; accueil inspecté localement aux formats 1440 px et 375 px sans erreur console ni débordement.

## 2026-08-20 — Codex — Récupération Super Admin

- **Authentification :** ajout d'un parcours de récupération par e-mail à usage unique pour le Super Admin : demande non énumérante, page de choix d'un nouveau mot de passe et redirection vers la console. Aucun mot de passe n'est généré, exposé ni conservé par l'application.
- **Accès :** la page de récupération est explicitement publique dans le middleware, uniquement pour laisser le lien signé établir sa session avant la protection de la console.

## 2026-08-20 — Codex — Épure de l'accueil et de la connexion

- **Accueil :** retrait du halo aqua et remplacement de la promesse principale par « SIMPLE MAIS PUISSANT », en conservant le verrouillage du sous-titre sous le logo centré.
- **Connexion et splash :** choix de rôle sans emoji, avec les deux actions corail, et splash ajusté (mot-symbole plus bas, apparition/disparition uniquement en fondu, sans halo ni mouvement).

## 2026-08-19 — Codex — Accueil LETI simplifié

- **Landing page :** suppression de l'en-tête, des cartes de fonctionnalités et des logos secondaires. L'accueil se concentre désormais sur le logo central, le positionnement, la promesse, les deux actions et un pied de page discret centré.

## 2026-08-19 — Codex — Finitions LETI et fluidité de navigation

- **Marque et interface :** création de déclinaisons PNG réellement transparentes du sigle, du mot-symbole et du lockup officiels (originaux conservés) ; le logo n'a plus de plaque blanche dans le splash ni dans la navigation. Le hero de l'accueil met désormais LETI en avant, les boutons ont un reflet vitre discret et les fonds clairs reçoivent une touche aqua légère.
- **Splash :** séquence plus lente et plus fluide (sigle, mot-symbole, temps de lecture puis fondu), toujours non bloquante et respectueuse de `prefers-reduced-motion`.
- **Fluidité :** navigation `/app` préchargée seulement sur intention explicite (une destination à la fois), retour visuel immédiat au clic et volet d'assistance chargé à la demande. Le contexte de session regroupe membership, workspace et permissions dans une seule lecture relationnelle après l'authentification, supprimant un aller-retour serveur par rendu authentifié.
- **Base :** audit Supabase effectué ; aucun index ou policy RLS n'a été modifié, car le volume réel et les index actuels n'expliquent pas la lenteur ressentie.
- **Vérification :** typecheck, build et 35 tests unitaires validés ; accueil, splash et connexion contrôlés localement sans overlay ni débordement.

## 2026-08-19 — Codex — Rebranding et Design System LETI

- **Tâche :** refonte visuelle complète de l'expérience utilisateur, sans changement de logique métier, données, routes ou permissions.
- **Design System :** tokens LETI dans Tailwind/CSS (bleu nuit, aqua, corail mesuré, blanc cassé, Inter, surfaces et contrôles partagés) ; suppression de l'ancien effet de boutons « verre » et harmonisation de l'App Shell, des écrans publics, portail et Super Admin.
- **Marque et Splash :** assets officiels intégrés sous `public/leti/`, logo SVG historique remplacé, métadonnées/favicons/libellés visibles renommés LETI ; splash non bloquant au chargement initial (symbole puis wordmark, transition courte, `prefers-reduced-motion`).
- **Vérification :** typecheck, build et 35 tests unitaires validés ; inspection navigateur de l'accueil et de la connexion à 375, 768 et 1440 px sans débordement, overlay ni erreur avec la configuration locale.

## 2026-08-19 — Codex — Compression photo Safari

- **Tâche :** correction du repli Safari qui transformait parfois une demande WebP en PNG trop volumineux.
- **Correctif :** préférence stricte pour WebP réel, puis JPEG ; réduction progressive de la résolution et de la qualité jusqu’à 5 Mo au maximum.
- **Vérification :** typecheck, build et 35 tests locaux validés.

## 2026-08-19 — Codex — Publication photo mobile « Entre nous »

- **Tâche :** correction du formulaire de publication qui pouvait afficher une erreur JavaScript opaque après l’ajout d’une photo mobile.
- **Cause et correctif :** l’action serveur ne dépend plus du constructeur global `File`, son retour est systématiquement normalisé et les images iPhone/Safari sont converties avec un repli compatible en JPEG, PNG ou WebP avant l’envoi.
- **Vérification :** typecheck, build et 35 tests locaux validés ; les tests d’intégration Supabase restent conditionnels aux secrets locaux.

## 2026-08-19 — Codex — Fil interne « Entre nous » et fonctions d’équipe

- **Tâche :** ajout du fil privé par entreprise (statuts, photos optimisées, réactions, commentaires, modération et pagination), nouveau menu dédié et renommage « Tâches & Notes » ; les fonctions sont maintenant saisissables à la création d’un membre et affichées avec son identité.
- **Sécurité :** tables, RLS, permissions `community.view` / `community.publish`, trigger d’intégrité multi-tenant et bucket `community-media` privé ; les opérations sensibles passent par des actions serveur contrôlées.
- **Migrations :** `20260819063848_community_feed` et `20260819065159_community_feed_indexes`, appliquées au projet Supabase de production.
- **Vérification :** contrôle structurel et advisor Supabase sans nouveau signal de sécurité pour ce domaine ; tests, typecheck et build relancés avant publication.

## 2026-08-17 — Codex — Workflow collaboratif initialisé

- **Tâche :** création de la mémoire commune et ajout des règles de continuité dans `AGENTS.md` et `CLAUDE.md`.
- **Fichiers :** `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md`, `DECISIONS.md`, `AGENTS.md`, `CLAUDE.md`.
- **Migrations :** aucune.
- **À surveiller :** `ARCHITECTURE.md` et `README.md` contiennent encore des références historiques au mode démo ; la mémoire commune décrit l'état actuel vérifié.
- **Reste à faire :** aucune action fonctionnelle liée à ce workflow.

## 2026-08-17 — Codex — Refonte éditoriale de la landing page

- **Tâche :** formulation plus professionnelle du hero, des boutons et des six cartes de la page d'accueil.
- **Fichier :** `src/app/page.tsx`.
- **Migrations :** aucune.
- **Publication :** commit GitHub `ba74a601cc2424174bdc8fba9d4980cbd9e9ec0c`, déploiement Vercel production `READY` vérifié.
- **À surveiller :** le build et le typecheck passent. Deux tests de planning échouaient dans cet environnement sur un décalage de date/fuseau horaire, sans lien avec la landing page.

## 2026-08-17 — Codex — Finition verre des boutons

- **Tâche :** harmonisation visuelle de tous les boutons avec un reflet de surface, des dégradés, une bordure lumineuse et une profondeur discrète.
- **Fichier :** `src/app/globals.css`.
- **Migrations :** aucune.
- **Vérification :** build et typecheck validés ; deux tests Planning restent en échec sur le décalage de fuseau horaire déjà connu, sans lien avec ce changement CSS.

## 2026-08-17 — Claude Code — Intégration au workflow de mémoire commune

- **Tâche :** vérification de la mémoire commune préparée par Codex et confirmation de l'intégration de Claude Code au workflow partagé.
- **Fichiers :** lecture de `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `AI_CHANGELOG.md`, `DECISIONS.md` ; ajout de cette entrée.
- **Constat :** les cinq fichiers existent et sont cohérents. `CLAUDE.md` contient déjà la section « Workflow collaboratif Codex ↔ Claude Code » (règles permanentes côté Claude) ; `AGENTS.md` fournit la section miroir côté Codex. Mêmes cibles infra, même état migrations (0001→0021), même périmètre fonctionnel. Aucune correction nécessaire.
- **Migrations :** aucune.
- **À surveiller :** rien de bloquant. `ARCHITECTURE.md`/`README.md` gardent des références historiques au mode démo (déjà signalé par Codex) ; la mémoire commune reste la source de vérité de l'état actuel.
- **Reste à faire :** aucune action fonctionnelle ; workflow partagé opérationnel dans les deux sens.

## 2026-08-17 — Codex — Durcissement sécurité multi-tenant

- **Tâche :** protections tenant au niveau base, permissions RLS métier, portail client, backups, uploads et correctif Next.js.
- **Migrations :** `0022_tenant_security_hardening` et `0023_portal_attempts_deny_policy`, appliquées au projet Supabase de production.
- **Vérification :** diagnostic préalable sans relation cross-workspace incohérente ; triggers et fonctions non exécutables directement par anon/authenticated ; typecheck, lint et build validés.
- **À surveiller :** les tests intégration Supabase sont conditionnels aux variables locales ; deux tests Planning restent dépendants du fuseau horaire local (antérieurs à cette intervention).

## 2026-08-18 — Codex — Fluidité, interactions de notes et carte groupée

- **Tâche :** navigation perçue instantanément (squelette d'application, préchargement au survol, requêtes parallélisées et URLs Storage groupées), ordre prioritaire du menu, en-têtes explicatifs, boutons plus légers, badge de notifications corrigé et carte regroupant les prestations d'une même adresse/client.
- **Notes d'équipe :** ajout des lectures, exécutions et commentaires en détail de note avec mises à jour optimistes ; les listes de commentaires restent différées.
- **Migrations :** `0024_team_note_interactions` et `0025_team_note_interaction_indexes`, appliquées en production ; RLS, trigger d'intégrité multi-tenant et index FK vérifiés.
- **Vérification :** typecheck et build validés ; tests unitaires/intégration exécutés (deux échecs Planning de fuseau horaire, préexistants) ; interface de connexion vérifiée sans erreur aux formats desktop, tablette et mobile.

## 2026-08-18 — Codex — Dates métier La Réunion

- **Tâche :** correction des calculs de planning qui convertissaient une date civile en UTC et pouvaient ainsi revenir à la veille entre minuit et 4 h à La Réunion.
- **Portée :** utilitaire `Indian/Reunion` partagé, planning, tableau de bord, filtres de prestations, portail client et génération de prestations récurrentes ; aucune donnée existante modifiée, aucune migration.
- **Vérification :** tests dédiés au passage de minuit et à la validation des dates civiles, puis typecheck/build.

## 2026-08-18 — Codex — Assistance des utilisateurs de l'application

- **Tâche :** ajout d'un volet flottant « Aide & retours » dans `/app` pour signaler un bug, demander de l'aide ou proposer une amélioration ; aucune exposition aux clients finaux.
- **Sécurité :** conversations rattachées au `membership_id` issu de la session serveur, actions contrôlées côté serveur et lecture filtrée par membre/workspace avec les RLS existantes. Le portail client et son widget restent séparés et inchangés.
- **Super Admin :** liste et détail distinguent maintenant clairement un utilisateur de l'application d'un client portail ; les réponses apparaissent dans le bon fil.
- **Migrations :** aucune — le schéma et les règles RLS de support interne existaient déjà et ont été vérifiés en production.
- **Vérification :** typecheck, build et 28 tests validés ; 12 tests d'intégration restent ignorés sans secrets Supabase de test.

## 2026-08-18 — Codex — Correctif des interactions de notes d'équipe

- **Tâche :** correction de l'échec des actions « Lu », « Fait » et des commentaires dans les notes d'équipe.
- **Cause :** le trigger partagé lisait des colonnes `NEW` absentes sur certaines des trois tables d'interactions.
- **Migration :** `0026_fix_team_note_interaction_guard`, appliquée au projet Supabase de production ; l'intégrité multi-tenant, la RLS et la non-exécution directe de la fonction sont conservées.
- **Vérification :** typecheck, build et 28 tests locaux validés ; transaction de production sous rôle authentifié validant les trois insertions, puis annulée sans créer de donnée.

## 2026-08-18 — Codex — Revenus des entretiens et aperçu financier

- **Tâche :** renommage visible de « Prestations » en « Mes entretiens », annonces de navigation « Mes chantiers » et « Gérer ma comptabilité », puis ajout des montants facturés aux prestations ponctuelles et des revenus mensuels aux contrats récurrents.
- **Architecture et sécurité :** nouvelle table séparée `service_financials`, isolée par `workspace_id` et protégée en lecture/écriture par RLS admin-only. Un montant récurrent est relié à une série, jamais à ses occurrences ; les employés ne reçoivent aucune requête, donnée ou rendu financier.
- **Dashboard :** carrousel financier réservé au gérant avec les quatre vues prévues : entretiens, ponctuel mensuel, total et frais « En développement ».
- **Migrations :** `20260818192021_service_financials`, `20260818193027_service_financials_client_index` et `20260818193724_service_financials_guard_service_kind`, appliquées au projet Supabase de production.
- **Vérification :** typecheck, lint, build et tests unitaires validés ; transaction RLS annulée validant les droits admin, le refus membre et l'isolation des workspaces.
