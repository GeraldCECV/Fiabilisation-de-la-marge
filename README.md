# Trame de rentabilité VN

Application interne de calcul de marge et de suivi des ventes VN (véhicules neufs).

## Stack
- **Next.js 14** (App Router) — frontend + logique serveur
- **Supabase** (Postgres + Auth) — base de données et authentification
- **Vercel** — hébergement
- **GitHub** — versionning + déploiement continu

## 1. Créer le projet Supabase
1. Sur [supabase.com](https://supabase.com), créez un nouveau projet, région **Frankfurt (eu-central-1)**.
2. Dans **SQL Editor**, collez le contenu de `supabase/schema.sql` et exécutez-le. Cela crée toutes les tables, les barèmes de marge par défaut et les forfaits fixes, avec la sécurité par ligne (RLS) activée.
3. Dans **Project Settings → API**, notez :
   - `Project URL`
   - `anon public key`

## 2. Créer votre premier utilisateur responsable
1. Dans **Authentication → Users**, cliquez sur "Add user" (email + mot de passe).
2. Dans **SQL Editor**, exécutez (en remplaçant l'UUID par celui de l'utilisateur créé) :
   ```sql
   insert into public.utilisateurs (id, nom, role)
   values ('UUID_DE_LUTILISATEUR', 'Votre nom', 'RESPONSABLE');
   ```
   Répétez pour chaque commercial, avec `role = 'COMMERCIAL'`.

## 3. Importer votre référentiel véhicules/options
Le calculateur lit les tables `marques`, `modeles`, `options`, `compatibilites`. Un script d'import est fourni pour les données Dreamer + Rapido déjà validées dans le prototype :

```bash
npm install
cp .env.local.example .env.local
# renseignez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# ET SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> service_role)
npm run seed
```

Le script (`scripts/seed.js`, données dans `scripts/seedData.js`) est idempotent : il repart de zéro
pour les marques Dreamer et Rapido à chaque exécution, sans jamais toucher aux dossiers de vente déjà
enregistrés. Pour ajouter une nouvelle marque, complétez `scripts/seedData.js` sur le même modèle
(véhicules avec prix usine HT/prix public TTC, options avec statut O/S/- par véhicule) puis relancez
`npm run seed`.

## 4. Lancer en local
```bash
npm install
cp .env.local.example .env.local   # puis renseignez vos clés Supabase
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000).

## 5. Déployer
1. Poussez ce dossier sur un dépôt GitHub.
2. Sur [vercel.com](https://vercel.com), "Add New Project" → importez le dépôt.
3. Dans les variables d'environnement Vercel, ajoutez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Déployez. Chaque push sur `main` redéploiera automatiquement.

## Structure
```
app/
  login/page.js              → connexion
  (app)/layout.js             → navigation + garde de session
  (app)/page.js               → tableau de bord
  (app)/calculateur/page.js   → calculateur de marge (branché Supabase)
  (app)/dossiers/page.js      → liste des dossiers de vente
lib/
  supabase.js                 → clients Supabase (navigateur + serveur)
  margeEngine.js               → moteur de calcul de marge (logique RENTA VN)
supabase/
  schema.sql                   → schéma complet + RLS
```

## Ce qui reste à construire
- Import automatisé du référentiel véhicules/options par marque
- Gestion des packs (options groupées, ex. "PACK ENERGY")
- Page statistiques (marge par vendeur / marque / période)
- Édition d'un dossier existant (verrouillage à la vente, historique)
- Écran d'administration des barèmes et forfaits fixes
