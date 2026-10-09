# DUPE PERFUMS

Boutique en ligne complète pour une marque de parfums premium — vitrine client + back-office admin — construite avec Next.js 14 (App Router), TypeScript, Tailwind CSS et Supabase.

## Démarrage

1. `npm install` (installe aussi three.js / React Three Fiber pour le hero 3D)
2. Créez un projet [Supabase](https://supabase.com), puis exécutez **dans l'ordre**, dans l'éditeur SQL :
   1. `supabase/schema.sql` (tables, RLS, fonctions `place_order`/`track_order`, données de démonstration)
   2. `supabase/migration_wilaya_pricing.sql` (crée la table des 69 wilayas — la partie « prix produit par wilaya » de ce fichier est immédiatement remplacée par l'étape suivante, gardez-le pour les 69 wilayas)
   3. `supabase/migration_storage.sql` (bucket `product-images`, idempotent)
   4. `supabase/migration_delivery_by_wilaya.sql` — supprime le système de prix produit par wilaya et le remplace par un frais de livraison par wilaya, identique pour tous les produits
   5. `supabase/migration_unified_stock.sql` **(nouveau)** — si votre projet existe déjà : relie le stock du flacon plein et celui des portions 10ML (même liquide, un seul stock physique en ml). Pas nécessaire sur un projet neuf : `schema.sql` inclut déjà ce comportement.
3. Copiez `.env.example` vers `.env.local` et renseignez l'URL + la clé anonyme du projet.
4. Créez un utilisateur admin dans Supabase Auth (Authentication → Add user, **avec mot de passe**, pas « Invite ») puis exécutez :
   ```sql
   insert into admins(user_id, full_name)
   select id, 'Admin' from auth.users where email = '<email-de-l-admin>';
   ```
5. `npm run dev` → http://localhost:3000 (admin : `/admin`, protégé par `middleware.ts`)

## Ce qui est inclus

**Boutique client** — accueil (hero, catégories, meilleures ventes, avantages, bannière collection, grille Instagram, newsletter), `/shop` avec recherche/filtres/tri, fiche produit avec sélecteur Full Size / 10ML, panier, checkout (wilayas, paiement à la livraison, code promo), confirmation de commande, suivi de commande public, favoris, à propos, FAQ, contact (formulaire → base de données), sitemap.xml et robots.txt.

**Admin** (`/admin`, authentification Supabase requise) — dashboard avec CA (jour/semaine/mois/total), graphiques 14 jours, meilleures ventes, répartition des statuts, stock faible ; gestion des commandes avec filtres/statuts/actions et page de détail (timeline, WhatsApp, appel, notes) ; produits (CRUD complet, formats Full Size/10ML indépendants) ; catégories ; stock (mise à jour inline, seuils, alertes) ; clients (historique, total dépensé) ; promotions (codes, %, montant fixe, dates, limites d'usage) ; messages de contact ; paramètres (infos boutique, livraison, seuils) ; notifications en temps réel (nouvelle commande, annulation, stock faible/rupture, nouveau message).

**Base de données** — schéma Supabase complet (`products`, `categories`, `orders`, `order_items`, `customers`, `coupons`, `stock_movements`, `notifications`, `messages`, `newsletter_subscribers`, `settings`, `admins`), Row Level Security, triggers d'historique de statut, fonctions `place_order` (transactionnelle, gère stock/coupon/notifications) et `track_order` (suivi public sécurisé par numéro + téléphone), 14 produits de démonstration.

## Mise à jour — livraison par wilaya (remplace le prix produit par wilaya)

Le prix d'un parfum est désormais **le même partout en Algérie**. Ce qui varie par wilaya, c'est le **frais de livraison**, de la même façon pour tous les produits :

- Table `wilaya_delivery_fees` (wilaya, frais, desservie ou non). Sans ligne pour une wilaya, le frais par défaut des Paramètres s'applique.
- `place_order()` résout le frais de livraison **côté serveur uniquement** à partir de la wilaya envoyée — jamais confiance au navigateur — et refuse la commande si la wilaya n'est pas desservie (`WILAYA_NOT_SERVED`) ou inconnue (`INVALID_WILAYA`).
- Admin : `/admin/delivery` (grille des 69 wilayas, tarif + case « desservie », actions groupées, recherche). Client : sélecteur de wilaya dans la navbar / panier / checkout, qui affiche le frais de livraison estimé (`get_delivery_fee()`), plus un message si la wilaya n'est pas desservie.
- L'ancienne table `product_wilaya_prices` (prix produit par wilaya) et les fonctions/vues associées sont supprimées par `migration_delivery_by_wilaya.sql`.

## Corrections de sécurité

- **`middleware.ts`** ne vérifiait auparavant que la présence d'une session Supabase authentifiée pour laisser passer vers `/admin/*`, sans vérifier l'appartenance à la table `admins`. Les données restaient protégées par les policies RLS (`is_admin()`), mais un utilisateur authentifié non-admin pouvait tout de même atteindre l'interface `/admin`. Le middleware vérifie maintenant explicitement une ligne dans `admins`, et déconnecte + redirige avec un message sinon.
- **Upsert client dans `place_order()`** : une commande passée avec le numéro de téléphone d'un client existant n'écrase plus son nom enregistré (seules les coordonnées de livraison, légitimement amenées à changer, sont mises à jour). Notez que l'adresse de livraison de chaque commande est de toute façon toujours conservée telle quelle sur la commande elle-même (`orders.address/commune/wilaya`), indépendamment de la fiche client.
- **Validation téléphone et quantité côté serveur** dans `place_order()` (`INVALID_PHONE`, `INVALID_QUANTITY`) : le formulaire de checkout validait déjà ces champs, mais rien n'empêchait un appel direct à la fonction SQL (ex. via l'API Supabase) de les contourner.

## Refonte précédente
- **Logo réel** intégré (fond rendu transparent) dans `public/brand/`.
- **Hero 3D** (`components/Hero3D.tsx`, React Three Fiber) : scène abstraite (orbe façon verre distordu + particules), chargée en lazy loading (`next/dynamic`, `ssr:false`), désactivée automatiquement si `prefers-reduced-motion` ou sur petit écran + faible mémoire estimée.
- **Micro-animations** : révélation au scroll (`components/Reveal.tsx`, IntersectionObserver, sans dépendance externe), hover premium sur les cartes produit.

## À compléter selon vos besoins

- Conversion automatique des images en WebP/AVIF à l'upload (actuellement : stockées telles quelles)
- Traductions arabe/anglais (l'architecture est prête : `lang` sur `<html>`, tous les textes en dur en français)
- Recherche avec autocomplétion et « récemment consultés »
- Un vrai modèle 3D de flacon si vous en fournissez un (actuellement : scène abstraite, cf. section 3D ci-dessus)

## Notes techniques

- Les pages admin lisent/écrivent directement via le client Supabase (RLS + policy `is_admin()`), sans API routes intermédiaires.
- **⚠️ Important** : les nouveaux fichiers 3D (`three`, `@react-three/fiber`, `@react-three/drei`, ajoutés à `package.json`) n'ont **pas pu être installés ni buildés dans cet environnement** (pas d'accès réseau ici). Faites impérativement `npm install` puis `npm run build` en local avant de déployer, pour attraper toute erreur de typage ou de version que je n'ai pas pu détecter sans exécution réelle. Le reste du code (SQL, composants non-3D) suit les conventions déjà en place dans le projet.
