-- =========================================================
-- Schéma "Trame de rentabilité VN" — Supabase (Postgres)
-- À exécuter dans Supabase > SQL Editor
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- Utilisateurs (miroir de auth.users avec rôle métier)
-- ---------------------------------------------------------
create table public.utilisateurs (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role text not null check (role in ('RESPONSABLE','COMMERCIAL')) default 'COMMERCIAL',
  marques_autorisees text[] default '{}', -- vide = toutes les marques
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Référentiel véhicules / options
-- ---------------------------------------------------------
create table public.marques (
  id uuid primary key default uuid_generate_v4(),
  nom text unique not null
);

create table public.modeles (
  id uuid primary key default uuid_generate_v4(),
  marque_id uuid references public.marques(id) on delete cascade,
  nom text not null,
  gamme text,
  type text check (type in ('CAMPING_CAR','CARAVANE')) not null,
  collection int not null,
  prix_usine_ht numeric not null,
  prix_public_ttc numeric not null,
  actif boolean default true,
  created_at timestamptz default now()
);

create table public.packs (
  id uuid primary key default uuid_generate_v4(),
  marque_id uuid references public.marques(id) on delete cascade,
  nom text not null,
  prix_ttc numeric,
  created_at timestamptz default now()
);

create table public.options (
  id uuid primary key default uuid_generate_v4(),
  marque_id uuid references public.marques(id) on delete cascade,
  designation text not null,
  achat_ht numeric not null,
  cession_pose numeric default 0,
  prix_ttc numeric not null,
  poids_kg numeric,
  created_at timestamptz default now()
);

-- Compatibilité option <-> modèle. Une ligne absente = indisponible.
create table public.compatibilites (
  modele_id uuid references public.modeles(id) on delete cascade,
  option_id uuid references public.options(id) on delete cascade,
  statut text check (statut in ('SERIE','OPTION','VIA_PACK')) not null,
  pack_id uuid references public.packs(id),
  primary key (modele_id, option_id)
);

-- ---------------------------------------------------------
-- Barèmes & forfaits (paramétrables, pas codés en dur)
-- ---------------------------------------------------------
create table public.baremes_marge (
  type text check (type in ('CAMPING_CAR','CARAVANE')) not null,
  annees_ecart int not null, -- 0 = collection la plus récente au moment de la vente
  taux numeric, -- null = déstockage (pas de taux cible)
  primary key (type, annees_ecart)
);

insert into public.baremes_marge (type, annees_ecart, taux) values
  ('CAMPING_CAR', 0, 0.12), ('CAMPING_CAR', 1, 0.11), ('CAMPING_CAR', 2, 0.08), ('CAMPING_CAR', 3, null),
  ('CARAVANE', 0, 0.14), ('CARAVANE', 1, 0.12), ('CARAVANE', 2, 0.10), ('CARAVANE', 3, null);

create table public.forfaits_fixes (
  cle text primary key,
  valeur numeric not null,
  description text
);

insert into public.forfaits_fixes (cle, valeur, description) values
  ('admin_cc', 135, 'Forfait admin camping-car'),
  ('admin_caravane', 20, 'Forfait admin caravane'),
  ('atelier_cc', 200, 'Forfait heures atelier camping-car'),
  ('atelier_caravane', 150, 'Forfait heures atelier caravane'),
  ('carte_grise_cc', 790, 'Carte grise camping-car'),
  ('carte_grise_caravane', 380, 'Carte grise caravane'),
  ('provision_sav_cc', 600, 'Provision effort commercial SAV camping-car'),
  ('taux_financement', 0.06, 'Taux de marge sur montant financé'),
  ('part_financement_attendue', 0.30, 'Part du prix supposée financée (calcul marge attendue)');

-- ---------------------------------------------------------
-- Dossiers de vente (trame de rentabilité) + historique versionné
-- ---------------------------------------------------------
create table public.dossiers_vente (
  id uuid primary key default uuid_generate_v4(),
  statut text check (statut in ('PROPOSITION','EN_COURS','VENDU','PERDU')) default 'PROPOSITION',
  client_nom text,
  vendeur_id uuid references public.utilisateurs(id),
  modele_id uuid references public.modeles(id),
  options_choisies uuid[] default '{}',
  expo text check (expo in ('PAS_EXPO','EXPO_ANNEE','EXPO_1_AN','EXPO_2_ANS')) default 'PAS_EXPO',
  prix_negocie_ttc numeric,
  financement_organisme text,
  financement_montant numeric default 0,
  marge_attendue numeric,
  marge_reelle numeric,
  commission_vendeur numeric,
  verrouille boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Historique : une ligne à chaque modification (jamais d'écrasement)
create table public.historique_dossier (
  id uuid primary key default uuid_generate_v4(),
  dossier_id uuid references public.dossiers_vente(id) on delete cascade,
  version int not null,
  auteur_id uuid references public.utilisateurs(id),
  snapshot jsonb not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
alter table public.utilisateurs enable row level security;
alter table public.dossiers_vente enable row level security;
alter table public.historique_dossier enable row level security;
alter table public.modeles enable row level security;
alter table public.options enable row level security;
alter table public.compatibilites enable row level security;
alter table public.marques enable row level security;

-- Référentiel (marques/modèles/options/compat) : lecture pour tout utilisateur connecté
create policy "lecture referentiel" on public.marques for select using (auth.role() = 'authenticated');
create policy "lecture referentiel modeles" on public.modeles for select using (auth.role() = 'authenticated');
create policy "lecture referentiel options" on public.options for select using (auth.role() = 'authenticated');
create policy "lecture referentiel compat" on public.compatibilites for select using (auth.role() = 'authenticated');

-- Utilisateurs : chacun voit son propre profil ; les responsables voient tout le monde
create policy "voir son profil" on public.utilisateurs for select using (
  auth.uid() = id or exists (select 1 from public.utilisateurs u where u.id = auth.uid() and u.role = 'RESPONSABLE')
);

-- Dossiers : un responsable voit tout ; un commercial ne voit que ses propres dossiers
create policy "dossiers select" on public.dossiers_vente for select using (
  exists (select 1 from public.utilisateurs u where u.id = auth.uid() and u.role = 'RESPONSABLE')
  or vendeur_id = auth.uid()
);
create policy "dossiers insert" on public.dossiers_vente for insert with check (auth.role() = 'authenticated');
create policy "dossiers update" on public.dossiers_vente for update using (
  not verrouille and (
    exists (select 1 from public.utilisateurs u where u.id = auth.uid() and u.role = 'RESPONSABLE')
    or vendeur_id = auth.uid()
  )
);

create policy "historique select" on public.historique_dossier for select using (
  exists (select 1 from public.utilisateurs u where u.id = auth.uid() and u.role = 'RESPONSABLE')
  or exists (select 1 from public.dossiers_vente d where d.id = dossier_id and d.vendeur_id = auth.uid())
);
create policy "historique insert" on public.historique_dossier for insert with check (auth.role() = 'authenticated');
