-- Cache auth helper calls once per query rather than once per topic row.
alter policy teacher_reads_own_ratings on public.student_topic_ratings
  using ((select auth.uid()) = owner_id and ((select auth.jwt())->>'is_anonymous') is distinct from 'true');
alter policy teacher_creates_own_ratings on public.student_topic_ratings
  with check ((select auth.uid()) = owner_id and ((select auth.jwt())->>'is_anonymous') is distinct from 'true');
alter policy teacher_updates_own_ratings on public.student_topic_ratings
  using ((select auth.uid()) = owner_id and ((select auth.jwt())->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) = owner_id and ((select auth.jwt())->>'is_anonymous') is distinct from 'true');
