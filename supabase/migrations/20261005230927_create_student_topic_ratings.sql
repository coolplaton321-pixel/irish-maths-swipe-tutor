-- Target: plato-maths-school (iljziesnhngxpbcrjvww) only.
-- This migration does not touch any other project or application table.
create table public.student_topic_ratings (
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null check (student_id in ('jay','aoife','liam','saoirse','cian','emma','noah','niamh','oisin','vladimir','masha','aarav','priya','rohan')),
  topic_id text not null check (topic_id ~ '^[a-z][a-z0-9-]{0,63}$'),
  rating text not null default 'grey' check (rating in ('grey','red','yellow','green')),
  primary key (owner_id, student_id, topic_id)
);

alter table public.student_topic_ratings enable row level security;

revoke all on public.student_topic_ratings from public, anon, authenticated;
grant select, insert, update on public.student_topic_ratings to authenticated;

create policy teacher_reads_own_ratings
  on public.student_topic_ratings for select to authenticated
  using ((select auth.uid()) = owner_id and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy teacher_creates_own_ratings
  on public.student_topic_ratings for insert to authenticated
  with check ((select auth.uid()) = owner_id and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy teacher_updates_own_ratings
  on public.student_topic_ratings for update to authenticated
  using ((select auth.uid()) = owner_id and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) = owner_id and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

comment on table public.student_topic_ratings is 'Private maths-topic colours, isolated by teacher account. Grey resets are stored explicitly.';
