# MAW3IDI — Design System & Prompt d'implémentation Frontend

> Ce document est destiné à être donné **tel quel** à un agent (développeur ou IA de code) chargé de construire le frontend de la plateforme MAW3IDI. Il contient : l'identité de marque, le design system complet (couleurs, typographie, composants, motion), et la spec détaillée de chaque écran (landing page + plateforme SaaS). Deux références visuelles ont guidé ce système : **Cal.com** (landing page + widget calendrier) et **DPGR Portal** (dashboard, tableaux, sidebar).

---

## 0. Instruction générale pour l'agent

Construis une application web en **React + TypeScript + Tailwind CSS**, avec **shadcn/ui** comme base de composants (Button, Card, Dialog, Dropdown, Tabs, Badge, Input, Table) et **lucide-react** pour les icônes. Utilise **recharts** pour les mini-graphiques du dashboard si nécessaire. La landing page et l'app doivent partager exactement les mêmes tokens de design définis ci-dessous (couleurs, radius, ombres, typo) — un seul fichier `tailwind.config.ts` avec ces tokens en `theme.extend`.

L'application doit supporter le **français** en langue principale d'interface, avec des contenus (messages patients, exemples) en **darija algérienne**. Prévoir dès le départ une structure i18n simple (dictionnaire FR, extensible AR/darija plus tard).

Deux zones distinctes à livrer :
1. **Landing page publique** (marketing, style Cal.com, recolorée en identité MAW3IDI) — routes `/`, `/pricing`, `/login`, `/signup`.
2. **Plateforme applicative** (dashboard multi-tenant, style DPGR Portal) — routes `/app/dashboard`, `/app/appointments`, `/app/appointments/:id`, `/app/calendar`, `/app/settings`, `/app/team`.

---

## 1. Identité de marque

**Logo** : cercle en dégradé bleu (bleu marine profond → bleu ciel lumineux), formant un "swoosh" incomplet façon montre/horloge de suivi. Au centre : une icône combinée téléphone + croix médicale (blanc sur fond bleu plein). Le wordmark **"MAW3IDI"** est en bleu plein, police à empattement/serif bold, avec le chiffre "3" stylisé remplaçant le "E" arabisant (référence à "Maw3id" = rendez-vous en arabe/darija).

**Ton de marque** : professionnel, rassurant, médical-friendly, moderne — jamais froid ni corporate-générique. Le bleu domine à 90% de l'interface ; le blanc est la surface de base. Aucune autre couleur "de marque" n'est utilisée — comme Cal.com, la palette est quasi-monochrome, et la couleur n'intervient que pour la **fonction** (statuts, alertes).

**Iconographie signature** : téléphone + croix médicale (à réutiliser en favicon, en loader, en état vide "empty state", en avatar par défaut du bot).

---

## 2. Palette de couleurs

### 2.1 Marque (Brand)

| Token | Hex | Usage |
|---|---|---|
| `brand-deep` | `#0F2A5C` | Point sombre du dégradé logo, texte sur fond clair très fort, footer dark |
| `brand-primary` | `#2563EB` | Couleur d'action principale — CTA, liens, wordmark, icônes actives |
| `brand-primary-active` | `#1D4ED8` | État pressed/hover des CTA primaires |
| `brand-sky` | `#38BDF8` | Point clair du dégradé logo — accents, hover léger, illustrations |
| `brand-gradient` | `linear-gradient(135deg, #0F2A5C 0%, #2563EB 55%, #38BDF8 100%)` | Hero background, boutons héros, bannière featured pricing, avatar bot |

### 2.2 Surfaces

| Token | Hex | Usage |
|---|---|---|
| `canvas` | `#FFFFFF` | Fond de page par défaut |
| `surface-soft` | `#F8FAFC` | Fond des sections alternées, sidebar |
| `surface-card` | `#F1F5F9` | Cartes, stat cards, badges pills |
| `surface-dark` | `#0B1220` | Footer, sidebar en mode sombre (option), tier pricing "featured" |
| `hairline` | `#E2E8F0` | Bordures 1px : inputs, cartes, séparateurs de table |

### 2.3 Texte

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#0F172A` | Titres, texte fort |
| `body` | `#334155` | Texte courant |
| `muted` | `#64748B` | Sous-titres, breadcrumbs, labels de colonnes |
| `on-dark` | `#F8FAFC` | Texte sur fond `brand-deep` / `surface-dark` |
| `on-dark-muted` | `#94A3B8` | Texte secondaire sur fond sombre |

### 2.4 Statuts fonctionnels (rendez-vous)

C'est la palette la plus importante de l'app — chaque statut doit être immédiatement reconnaissable (couleur du point + du texte + fond pastel du badge) :

| Statut | Couleur point/texte | Fond badge | Icône (lucide) |
|---|---|---|---|
| `PENDING` | `#D97706` (amber-600) | `#FEF3C7` | `clock` |
| `CONFIRMATION_SENT` | `#2563EB` (brand-primary) | `#DBEAFE` | `send` |
| `CONFIRMED` | `#16A34A` (green-600) | `#DCFCE7` | `check-circle-2` |
| `NEED_CALL` | `#EA580C` (orange-600) | `#FFEDD5` | `phone-call` |
| `CANCELLED` | `#DC2626` (red-600) | `#FEE2E2` | `x-circle` |
| `COMPLETED` | `#475569` (slate-600) | `#F1F5F9` | `check-check` |
| `NO_SHOW` | `#6B7280` (gray-500) | `#F3F4F6` | `user-x` |

> Règle : `NEED_CALL` doit toujours être visuellement le statut le plus "urgent" de l'interface après `PENDING` sans réponse — utiliser l'orange (jamais le rouge, réservé à `CANCELLED`) pour ne pas le confondre avec une erreur.

### 2.5 Avatars / accents décoratifs (badges pastels, façon Cal.com)

Utilisés **uniquement** pour les avatars patients sans photo (initiales) et les tags décoratifs — jamais sur un CTA ou un statut fonctionnel :

`avatar-orange #FB923C` · `avatar-pink #EC4899` · `avatar-violet #8B5CF6` · `avatar-emerald #34D399` · `avatar-blue #60A5FA`

(Attribution déterministe : hash du nom du patient → une des 5 couleurs, pour que chaque patient garde toujours la même couleur d'avatar.)

---

## 3. Typographie

**Titres** : `Plus Jakarta Sans`, weight 700, letter-spacing légèrement négatif (-0.02em) — équivalent moderne/gratuit de "Cal Sans", même esprit géométrique-friendly.
**Corps / UI** : `Inter`, weights 400/500/600.
**Support Arabe/Darija** (contenus patients, aperçus de messages) : `IBM Plex Sans Arabic` — s'harmonise visuellement avec Inter, à charger uniquement sur les composants qui affichent du texte patient brut (aperçu de message WhatsApp, transcript d'appel).
**Monospace** (si affichage d'IDs, de liens de réservation type `maw3idi.com/cabinet-x`) : `JetBrains Mono`.

### Échelle typographique

| Token | Taille / poids / line-height / letter-spacing | Usage |
|---|---|---|
| `display-xl` | 60px / 700 / 1.05 / -0.02em | Hero landing "Le secrétaire qui ne dort jamais" |
| `display-lg` | 44px / 700 / 1.1 / -0.02em | Titres de section landing |
| `display-md` | 32px / 700 / 1.15 / -0.01em | Titre de page app (ex. "Rendez-vous") |
| `title-lg` | 22px / 600 / 1.3 | Titre de carte, montant pricing |
| `title-md` | 18px / 600 / 1.4 | Titre stat card, nom du patient dans le détail |
| `title-sm` | 16px / 600 / 1.4 | Nom patient dans table, item de nav actif |
| `body-md` | 15px / 400 / 1.5 | Texte courant |
| `body-sm` | 13.5px / 400 / 1.5 | Texte secondaire, cellule de table |
| `caption` | 12px / 600 / 1.3 / uppercase / +0.04em | Labels de colonnes de table, labels de section sidebar |
| `code` | 13px / 400 / 1.5 | Lien de réservation, IDs |
| `button` | 14px / 600 / 1 | Texte de bouton |

---

## 4. Spacing, radius, élévation

**Espacement** (échelle 4px) : `4, 8, 12, 16, 24, 32, 48, 64, 96px`. Rythme entre sections landing : `96px`. Padding interne des cartes : `24px` (dashboard) / `32px` (landing).

**Border radius** : `xs 4px` (badges), `sm 6px` (inputs), `md 8px` (boutons, cartes de table), `lg 12px` (stat cards), `xl 16px` (cartes feature landing), `pill/full` (badges de statut, avatars, filtre pills).

**Élévation** :
- `flat` — sidebar, topbar, table (pas d'ombre, juste `hairline`)
- `shadow-card` — `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)` → stat cards, dropdowns
- `shadow-modal` — `0 8px 24px rgba(15,23,42,0.12), 0 24px 48px rgba(15,23,42,0.16)` → drawer de détail RDV, dialogs
- `focus-ring` — anneau `3px` `#2563EB` à 15% d'opacité autour des inputs/boutons au focus (accessibilité obligatoire)

---

## 5. Motion & interactions

- **Durée standard** : 150ms pour hover/état, 200ms pour apparition de menu/dropdown, 280ms pour drawer/modal.
- **Easing** : `ease-out` pour l'entrée, `ease-in` pour la sortie. Jamais de `linear`.
- **Hover bouton primaire** : léger assombrissement (`brand-primary` → `brand-primary-active`) + `scale(1.0)` (pas de scale, juste couleur — cohérent avec Cal.com, sobre).
- **Badge de statut qui change** (ex: `PENDING` → `CONFIRMED` en live) : transition de couleur de fond en 300ms + une micro-pulsation unique (`scale 1 → 1.05 → 1`, 400ms) pour signaler visuellement le changement sans être distrayant.
- **Ligne de table nouvellement mise à jour** (ex. patient vient de répondre) : flash de fond bleu très léger (`#EFF6FF`) qui s'efface en 1.5s — sert d'indicateur "quelque chose a changé ici".
- **Drawer de détail RDV** : slide-in depuis la droite, 280ms ease-out, overlay fondu en parallèle.
- **Stat cards au chargement** : les barres de progression s'animent de 0 à leur valeur en 600ms ease-out au montage (comme les captures DPGR).
- **Toasts de confirmation d'action** (Confirm/Cancel cliqué) : slide-up + fade depuis le bas droit, auto-dismiss 4s, icône check vert / icône x rouge.

---

## 6. Composants — bibliothèque détaillée

### 6.1 Boutons

- `button-primary` : fond `brand-primary`, texte blanc, radius `md`, padding `10px 20px`, weight 600. Hover → `brand-primary-active`. Sur le hero landing uniquement, fond en `brand-gradient`.
- `button-secondary` : fond `canvas`, bordure `hairline` 1px, texte `ink`. Hover → fond `surface-soft`.
- `button-ghost` : pas de fond ni bordure, texte `brand-primary`, hover → `surface-soft`.
- `button-danger` : fond `#DC2626`, texte blanc — réservé exclusivement au bouton **Cancel** d'un rendez-vous.
- `button-success` : fond `#16A34A`, texte blanc — réservé exclusivement au bouton **Confirm**.
- `button-icon` : carré `36×36px`, radius `full`, bordure `hairline`, fond `canvas` — pagination, action rapide dans table.
- Tailles : `sm` (32px hauteur), `md` (40px, défaut), `lg` (48px, CTA landing).

### 6.2 Badge de statut (`StatusBadge`)

Pill avec point coloré (`8px`) + label, fond pastel de la couleur du statut (voir §2.4), texte de la même famille de couleur en version foncée (600), padding `4px 10px`, radius `full`, `caption`-like typo mais non uppercase (ex : `● Need Call`).

### 6.3 Stat Card (inspirée DPGR "Répartition par statut")

Carte `shadow-card`, radius `lg`, padding `24px`. En-tête : titre `title-md` à gauche, lien `Détail →` en `brand-primary` `body-sm` à droite. Corps : liste de lignes, chaque ligne = label (`body-sm`, `muted`) + barre de progression horizontale (`8px` hauteur, radius `full`, fond `surface-card`, remplissage coloré selon statut) + valeur numérique alignée à droite en `title-sm`.

Variante "budget/volume" (inspirée "État du budget") : gros chiffres en haut (`title-lg` valeur / `display-md` optionnel), une seule barre de progression pleine largeur en dessous, pourcentage aligné à droite.

Pour MAW3IDI, utiliser 2 stat cards en haut du dashboard :
1. **Répartition par statut** — Confirmés / En attente / Need Call / Annulés, avec compte.
2. **Aujourd'hui** — RDV du jour confirmés vs total (barre de progression = taux de confirmation du jour), + nombre de patients concernés.

### 6.4 Sidebar de navigation

Largeur `260px`, fond `surface-soft`, bordure droite `hairline`. En haut : logo MAW3IDI (icône + wordmark, `32px` hauteur). Sections avec label `caption` gris (`PRINCIPAL`, `COMPTE`) au-dessus des liens. Chaque item de nav : icône lucide `18px` + label `title-sm`, padding `10px 14px`, radius `md`. **Item actif** : fond `brand-primary` plein, texte blanc, icône blanche (comme "Toutes les demandes" dans DPGR mais en bleu MAW3IDI au lieu de bleu marine). Item inactif hover : fond `surface-card`.

En bas de sidebar (fixe) : carte profil utilisateur — avatar carré initiales (fond couleur avatar), nom `title-sm`, rôle `body-sm muted` en dessous, chevron `›` à droite pour ouvrir un menu (déconnexion en rouge `#DC2626`, comme DPGR).

**Items de nav selon le rôle** :
- *Secrétaire* : Dashboard, Rendez-vous (lecture uniquement — pas de bouton Confirm/Cancel visible ou grisé selon la décision produit), Historique.
- *Admin* : Dashboard, Rendez-vous (avec actions), Calendrier, Équipe, Paramètres du cabinet, Historique.

### 6.5 Topbar

Hauteur `72px`, fond `canvas`, bordure basse `hairline`. Gauche : titre de page `display-md` + `—` + sous-titre contextuel `body-sm muted` (ex: "Rendez-vous — Cabinet Dr. Amrani"). Droite : toggle langue pill (FR/AR, actif en `brand-primary`), icône cloche notifications avec badge rouge circulaire (compte), icône info circulaire outline.

### 6.6 Tableau des rendez-vous (composant central de l'app)

Reproduit très fidèlement la logique du tableau DPGR, adapté aux RDV :

**Barre au-dessus du tableau** : compteur "X rendez-vous trouvés" (`body-sm muted`) à gauche ; à droite, input de recherche patient (radius `full` ou `md`, icône loupe, placeholder "Rechercher un patient…") + bouton icône filtre (carré outline, icône `sliders-horizontal`).

**Filtres rapides en pills** (au-dessus, façon page Historique DPGR : "Tout / Cette session / Sessions précédentes") : `Tous / Aujourd'hui / Need Call / Confirmés / En attente / Annulés` — pill active en fond `brand-primary` plein texte blanc, inactive en `canvas` bordure `hairline`.

**Colonnes du tableau** :

| Colonne | Contenu |
|---|---|
| Patient | Avatar initiales coloré + nom (`title-sm`) sur ligne 1, téléphone (`body-sm muted`) sur ligne 2 |
| Type de RDV | Texte simple (Consultation, Contrôle, etc.) |
| Date & Heure | Icône calendrier + date, icône horloge + heure en dessous |
| Statut | `StatusBadge` (§6.2) |
| Dernière interaction | Texte + timestamp relatif ("Il y a 2h") en `body-sm muted` |
| Action requise | Texte court en `title-sm` couleur du statut (ex: "Appeler le patient" en orange) si applicable, sinon `—` |
| Actions | Icônes circulaires `button-icon` : œil (voir détail, toujours visible) ; si `NEED_CALL` → bouton success "Confirm" + bouton danger "Cancel" affichés en ligne (pas juste des icônes, du texte court dans un petit bouton, pour aller vite) |

Ligne de tableau : hauteur `64px`, hover → fond `surface-soft`, bordure basse `hairline` fine, clic sur la ligne (hors zone actions) → ouvre le drawer de détail.

**En-têtes de colonnes** : `caption` style (uppercase, gris, 12px, bold), triables sur Date et Statut (icône flèche double façon DPGR "SCORE ↑↓").

### 6.7 Drawer / panneau de détail d'un rendez-vous

Glisse depuis la droite, largeur `480px`, fond `canvas`, `shadow-modal`. En-tête : "Rendez-vous #1234" (`title-lg`) + bouton fermer (X) ; sous-titre patient + date/heure. Sous cette en-tête : `StatusBadge` grande taille centrée avec explication courte ("En attente d'un appel — le patient n'a pas répondu").

**Section Communication (timeline verticale)** — reproduit le §10 du brief produit : chaque événement = point coloré sur une ligne verticale + timestamp `body-sm muted` + description `body-md` (ex: "10:30 — Message de confirmation envoyé", "10:42 — Patient a répondu : « Oui je confirme »", "10:42 — Statut automatiquement changé en CONFIRMED"). Le message patient reçu est affiché dans une bulle façon chat (fond `surface-card`, radius `lg`, coin arrondi asymétrique côté patient), en police `IBM Plex Sans Arabic`/`Inter` selon la langue détectée du message.

**Footer d'action fixe en bas du drawer** (uniquement si statut = `NEED_CALL`, et uniquement visible si rôle = Admin) : deux gros boutons pleine largeur côte à côte — `button-success "Confirmer le rendez-vous"` / `button-danger "Annuler le rendez-vous"`.

### 6.8 Widget calendrier (hero landing + vue Calendrier de l'app)

Reproduction fidèle de la logique Cal.com : à gauche, mini-calendrier mensuel — ligne de jours `L M M J V S D`, grille de dates, jour sélectionné en cercle plein `brand-primary`, jours disponibles en texte `ink` normal, jours indisponibles en `muted` clair non cliquables. À droite du calendrier, liste verticale de créneaux horaires disponibles en pills cliquables (bordure `hairline`, hover → bordure `brand-primary`, sélectionné → fond `brand-primary` texte blanc) : `09:00`, `10:30`, `14:00`, etc.

Dans la **landing page** (hero), ce widget est un mockup illustratif (pas fonctionnel) montrant "comment un patient réserve" — encadré dans une carte `shadow-card` légèrement inclinée/flottante au-dessus du dégradé de fond du hero.

Dans **l'app (vue Calendrier)**, ce même composant devient fonctionnel et affiché à côté d'un flux journalier des événements Google Calendar connectés (liste "18 septembre — 09:00 Consultation Patient A / 10:00 Consultation Patient B…", § 14 du brief produit).

### 6.9 Cartes de fonctionnalité (landing)

Radius `xl`, fond `surface-card`, padding `32px`, pas de bordure. Icône emoji ou lucide dans un cercle `48px` fond blanc en haut. Titre `title-md`, description `body-md muted` en dessous. Grille 3 colonnes desktop → 1 colonne mobile.

### 6.10 Cartes tarifaires (pricing)

Deux cartes (Standard / Pro), radius `lg`, `shadow-card`, padding `32px`, largeur égale, la carte **Pro** légèrement mise en avant (bordure `2px brand-primary` ou fond `surface-dark` inversé façon "featured tier" Cal.com avec texte blanc).

- **Standard** — 150 000 DA / an : "Agent de messagerie 24/7", "Planification & gestion des rendez-vous", "Messages de confirmation automatiques", "Tableau de bord & historique". CTA `button-secondary` "Choisir Standard".
- **Pro** — 250 000 DA / an : tout Standard + "Agent d'appel téléphonique 24/7", "Relances vocales automatiques". Badge "Recommandé" en haut à droite de la carte (badge pastel `avatar-emerald`). CTA `button-primary` (ou gradient) "Choisir Pro".

Prix affiché en `display-sm`, suffixe "DA / an" en `body-sm muted` à côté.

### 6.11 Formulaires de configuration (disponibilités, seuil Need Call)

Grille type "semaine" : chaque jour (`Lundi` → `Dimanche`) en `title-sm`, avec toggle actif/inactif à gauche (switch), et à droite un ou plusieurs blocs plage horaire (`08:00` → `12:00`) en inputs time côte à côte séparés par un tiret, bouton `+ Ajouter un créneau` en `button-ghost` sous chaque jour, bouton icône poubelle pour retirer un créneau.

Champ séparé, en haut de la page Paramètres : "Délai avant passage en Need Call" — input numérique + select unité (minutes/heures), avec texte d'aide `body-sm muted` expliquant l'effet ("Si le patient ne répond pas à la confirmation dans ce délai, le rendez-vous passera automatiquement en Need Call.")

### 6.12 Gestion d'équipe (Admin only)

Table simple : Avatar + Nom, Email, Rôle (badge "Secrétaire" ou "Admin"), Date d'ajout, Action (bouton "Retirer" en `button-ghost` texte rouge). Bouton `button-primary "+ Ajouter un secrétaire"` en haut à droite ouvrant un dialog avec formulaire (nom, email, envoi d'invitation).

---

## 7. Spécification des écrans

### 7.1 Landing page (`/`)

1. **Topnav** : logo MAW3IDI à gauche ; liens `Fonctionnalités · Comment ça marche · Tarifs · Contact` au centre ; à droite `Connexion` (ghost) + `Essai gratuit` (primary).
2. **Hero** : fond `brand-gradient` en diagonale douce (pas plein écran agressif — dégradé qui s'estompe vers `canvas` en bas, comme un wash). Titre `display-xl` : *"Le secrétaire qui ne dort jamais"*. Sous-titre `body-md` sur fond clair : *"MAW3IDI répond, confirme et planifie les rendez-vous de votre cabinet 24/7, en français et en darija."* Deux CTA (`Essai gratuit` primary + `Voir la démo` secondary). À droite, le **widget calendrier** (§6.8) flottant dans une carte.
3. **Bande de confiance** : logos/mentions "Utilisé par des cabinets médicaux à Alger, Oran, Constantine" en `caption muted`.
4. **Section Fonctionnalités** (grille 3 cartes, §6.9) : "Réponses automatiques WhatsApp & Instagram", "Appels téléphoniques automatisés" (Pro), "Confirmations & rappels intelligents".
5. **Section "Comment ça marche"** : 3-4 étapes horizontales avec numéro rond `brand-primary`, reprenant le flux du §16 du brief produit (Demande → Disponibilité → Réservation → Confirmation).
6. **Section "Voir → Comprendre → Agir"** : mockup illustratif du dashboard/tableau (capture stylisée, façon captures DPGR mais en identité MAW3IDI) pour montrer concrètement l'interface admin.
7. **Témoignages** : cartes `surface-card` avec avatar initiales, citation, nom + fonction + nom du cabinet.
8. **Tarifs** (§6.10) : les 2 cartes Standard/Pro, centrées, avec toggle "Annuel" (pas de mensuel, prix annuels uniquement).
9. **CTA final** : bande pleine largeur fond `brand-deep`, texte blanc, gros titre + bouton primaire blanc sur fond sombre.
10. **Footer** : fond `surface-dark`, colonnes de liens, mention légale, logo en version monochrome blanche.

### 7.2 Dashboard (`/app/dashboard`)

Topbar "Dashboard — Cabinet {nom}". Rangée de 2 stat cards (§6.3). En dessous, une **liste d'action prioritaire** : carte pleine largeur listant les RDV `NEED_CALL` du jour, chacun sur une ligne compacte (nom patient, heure, bouton "Voir" qui ouvre le drawer) — c'est la traduction directe du principe "Voir → Comprendre → Agir" en haut de la hiérarchie visuelle du dashboard. Enfin, un aperçu "Aujourd'hui" façon mini-agenda (liste chronologique simple des RDV du jour, sans être un calendrier complet — ce composant renvoie vers `/app/calendar` via un lien "Voir le calendrier complet →").

### 7.3 Rendez-vous (`/app/appointments`)

Reprend intégralement §6.6 (barre de recherche + filtres pills + tableau). Pagination en bas façon DPGR (icônes `‹ ›` en `button-icon`, numéro de page au centre).

### 7.4 Calendrier (`/app/calendar`)

Vue calendrier mensuelle/hebdomadaire pleine page utilisant le composant §6.8 en grand format, avec les événements Google Calendar synchronisés affichés comme des blocs colorés dans les créneaux (couleur = statut MAW3IDI si c'est un RDV géré par la plateforme, gris neutre si c'est un événement Google Calendar externe non lié à un RDV). Toggle en haut à droite `Jour / Semaine / Mois`. Bouton `button-secondary "Connecter Google Calendar"` si non connecté, sinon badge vert "Connecté" avec le compte affiché.

### 7.5 Paramètres du cabinet (`/app/settings`) — Admin only

Onglets (Tabs shadcn) : `Disponibilités` (§6.11) · `Automatisation` (seuil Need Call, activation/désactivation par canal WhatsApp/Instagram/Appel selon le plan) · `Informations du cabinet` (nom, logo, adresse, plan actuel avec bouton "Changer de plan").

### 7.6 Équipe (`/app/team`) — Admin only

Table décrite en §6.12.

### 7.7 États vides et de chargement

Tout tableau vide affiche l'icône signature (téléphone + croix) en grand, gris clair, avec texte `"Aucun rendez-vous pour ce filtre"`. Skeletons (rectangles `surface-card` pulsants) pendant le chargement des tableaux et stat cards — jamais de spinner plein écran.

---

## 8. Accessibilité & responsive

- Contraste texte/fond conforme AA minimum partout, en particulier les badges de statut pastel (texte toujours en version 600/700 de la couleur, jamais la couleur pure sur fond pastel clair).
- Cibles tactiles minimum `40×40px`.
- Breakpoints : `mobile <768px` (sidebar devient un drawer/menu hamburger, tableau passe en liste de cartes empilées au lieu de colonnes), `tablet 768–1024px` (sidebar réduite en icônes seules, tableau garde les colonnes essentielles : Patient/Statut/Action), `desktop 1024–1440px` (layout complet), `wide >1440px` (contenu centré max `1280px`).
- Sur mobile, le drawer de détail RDV devient plein écran au lieu d'un panneau latéral.

---

## 9. Livrables attendus de l'agent

1. `tailwind.config.ts` avec tous les tokens ci-dessus.
2. Bibliothèque de composants (`StatusBadge`, `StatCard`, `Sidebar`, `Topbar`, `AppointmentsTable`, `AppointmentDrawer`, `CalendarWidget`, `PricingCard`, `AvailabilityForm`).
3. Landing page complète (§7.1).
4. Pages applicatives (§7.2 à 7.6) avec données mockées réalistes en français/darija pour la démo.
5. Gestion des deux rôles (Secrétaire / Admin) avec masquage conditionnel des actions et des routes `settings`/`team`.
6. Mode responsive complet testé sur les 4 breakpoints ci-dessus.
