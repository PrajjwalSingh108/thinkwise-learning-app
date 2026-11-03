-- THINKWISE PRODUCT MVP
-- Run this entire file in Supabase SQL Editor (or apply with Supabase CLI).
-- Question answer keys live in a private schema; authenticated clients cannot select them.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('student', 'teacher', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Student',
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('Computer Science','Mathematics','Physics','Biology')),
  topic text not null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  hint text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index questions_subject_difficulty_idx on public.questions(subject, difficulty) where is_active;

create table private.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_index integer not null check (correct_index >= 0),
  explanation text not null
);
revoke all on private.question_keys from public, anon, authenticated;

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  subject text not null,
  topic text not null,
  difficulty text not null,
  selected_index integer not null,
  is_correct boolean not null,
  used_hint boolean not null default false,
  created_at timestamptz not null default now()
);
create index attempts_user_created_idx on public.attempts(user_id, created_at desc);
create index attempts_subject_idx on public.attempts(user_id, subject);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  subject text not null check (subject in ('Computer Science','Mathematics','Physics','Biology')),
  join_code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index group_messages_group_created_idx on public.group_messages(group_id,created_at);

create table public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index group_challenges_group_created_idx on public.group_challenges(group_id,created_at desc);

create table public.group_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_index integer not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique(challenge_id,user_id)
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 70),
  teacher_id uuid not null references public.profiles(id),
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create table public.classroom_members (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (classroom_id,student_id)
);

create table private.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  primary key (user_id, usage_date)
);
revoke all on private.ai_daily_usage from public, anon, authenticated;

-- Basic RLS membership helpers. SECURITY DEFINER avoids policy recursion.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=(select auth.uid()));
$$;

create or replace function public.is_class_teacher(p_classroom_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.classrooms c where c.id=p_classroom_id and c.teacher_id=(select auth.uid()));
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select p_profile_id=(select auth.uid())
  or exists (
    select 1 from public.group_members mine
    join public.group_members theirs on theirs.group_id=mine.group_id
    where mine.user_id=(select auth.uid()) and theirs.user_id=p_profile_id
  )
  or exists (
    select 1 from public.classroom_members mine
    join public.classroom_members theirs on theirs.classroom_id=mine.classroom_id
    where mine.student_id=(select auth.uid()) and theirs.student_id=p_profile_id
  )
  or exists (
    select 1 from public.classrooms c
    join public.classroom_members cm on cm.classroom_id=c.id
    where c.teacher_id=(select auth.uid()) and cm.student_id=p_profile_id
  );
$$;

-- RLS
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.group_challenges enable row level security;
alter table public.group_challenge_attempts enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;

create policy "users can read their own and learning-community profiles"
on public.profiles for select to authenticated using (public.can_view_profile(id));
-- No client update policy for role. Profile role changes are administrative.

create policy "authenticated users can read active questions"
on public.questions for select to authenticated using (is_active=true);

create policy "users read own attempts"
on public.attempts for select to authenticated using (user_id=(select auth.uid()));

create policy "group members can read groups"
on public.groups for select to authenticated using (public.is_group_member(id));

create policy "members can read group membership"
on public.group_members for select to authenticated using (public.is_group_member(group_id));

create policy "members can read group messages"
on public.group_messages for select to authenticated using (public.is_group_member(group_id));

create policy "members can send their own group messages"
on public.group_messages for insert to authenticated
with check (
  user_id=(select auth.uid())
  and public.is_group_member(group_id)
  and char_length(content) between 1 and 1500
);

create policy "members can read group challenges"
on public.group_challenges for select to authenticated using (public.is_group_member(group_id));
create policy "members can create group challenges"
on public.group_challenges for insert to authenticated
with check (created_by=(select auth.uid()) and public.is_group_member(group_id));
create policy "members can read challenge attempts"
on public.group_challenge_attempts for select to authenticated
using (exists(select 1 from public.group_challenges gc where gc.id=challenge_id and public.is_group_member(gc.group_id)));

create policy "class teachers and members can read classrooms"
on public.classrooms for select to authenticated
using (
  teacher_id=(select auth.uid())
  or exists(select 1 from public.classroom_members cm where cm.classroom_id=id and cm.student_id=(select auth.uid()))
);

create policy "class members and teacher can read roster"
on public.classroom_members for select to authenticated
using (
  student_id=(select auth.uid())
  or public.is_class_teacher(classroom_id)
);

-- Attempt submission is the only route that reads the private answer key.
-- It binds the user id from the JWT; clients cannot submit on behalf of another user.
create or replace function public.submit_attempt(
  p_question_id uuid,
  p_selected_index integer,
  p_used_hint boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_question public.questions%rowtype;
  v_key record;
  v_correct boolean;
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;
  select * into v_question from public.questions where id=p_question_id and is_active=true;
  if not found then raise exception 'Question is unavailable.'; end if;
  if p_selected_index < 0 or p_selected_index >= jsonb_array_length(v_question.options) then
    raise exception 'Invalid answer selection.';
  end if;
  select correct_index, explanation into v_key
  from private.question_keys where question_id=p_question_id;
  if not found then raise exception 'Answer key is unavailable.'; end if;
  v_correct := p_selected_index=v_key.correct_index;
  insert into public.attempts(user_id,question_id,subject,topic,difficulty,selected_index,is_correct,used_hint)
  values(v_user,p_question_id,v_question.subject,v_question.topic,v_question.difficulty,p_selected_index,v_correct,coalesce(p_used_hint,false));
  return jsonb_build_object(
    'correct',v_correct,
    'correct_index',v_key.correct_index,
    'explanation',v_key.explanation
  );
end;
$$;
revoke all on function public.submit_attempt(uuid,integer,boolean) from public, anon;
grant execute on function public.submit_attempt(uuid,integer,boolean) to authenticated;

-- Create / join study groups with membership handled atomically.
create or replace function public.create_study_group(p_name text,p_subject text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_code text; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  if char_length(trim(p_name)) not between 2 and 60 then raise exception 'Group name must be 2–60 characters.'; end if;
  if p_subject not in ('Computer Science','Mathematics','Physics','Biology') then raise exception 'Invalid subject.'; end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text),1,8));
  insert into public.groups(name,subject,join_code,created_by) values(trim(p_name),p_subject,v_code,v_user) returning id into v_id;
  insert into public.group_members(group_id,user_id) values(v_id,v_user);
  return jsonb_build_object('group_id',v_id,'join_code',v_code);
end;
$$;
revoke all on function public.create_study_group(text,text) from public, anon;
grant execute on function public.create_study_group(text,text) to authenticated;

create or replace function public.join_study_group(p_join_code text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_group uuid; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  select id into v_group from public.groups where join_code=upper(trim(p_join_code));
  if v_group is null then raise exception 'No group found for that invite code.'; end if;
  insert into public.group_members(group_id,user_id) values(v_group,v_user) on conflict do nothing;
  return v_group;
end;
$$;
revoke all on function public.join_study_group(text) from public, anon;
grant execute on function public.join_study_group(text) to authenticated;

-- One attempt per member per team challenge. The answer key remains private.
create or replace function public.submit_group_challenge_attempt(
  p_challenge_id uuid,
  p_selected_index integer
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_question public.questions%rowtype;
  v_key record;
  v_group uuid;
  v_correct boolean;
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
select gc.group_id
into v_group
from public.group_challenges gc
join public.questions q on q.id=gc.question_id
where gc.id=p_challenge_id and q.is_active=true;

if v_group is null or not public.is_group_member(v_group) then
  raise exception 'Challenge not found or you are not a group member.';
end if;

select q.*
into v_question
from public.group_challenges gc
join public.questions q on q.id=gc.question_id
where gc.id=p_challenge_id and q.is_active=true;

if not found then
  raise exception 'Challenge question not found.';
end if;
  if p_selected_index<0 or p_selected_index>=jsonb_array_length(v_question.options) then raise exception 'Invalid answer selection.'; end if;
  select correct_index,explanation into v_key from private.question_keys where question_id=v_question.id;
  if not found then raise exception 'Answer key is unavailable.'; end if;
  v_correct := p_selected_index=v_key.correct_index;
  insert into public.group_challenge_attempts(challenge_id,user_id,selected_index,is_correct)
  values(p_challenge_id,v_user,p_selected_index,v_correct);
  return jsonb_build_object('correct',v_correct,'correct_index',v_key.correct_index,'explanation',v_key.explanation);
exception when unique_violation then
  raise exception 'You have already submitted an answer for this challenge.';
end;
$$;
revoke all on function public.submit_group_challenge_attempt(uuid,integer) from public, anon;
grant execute on function public.submit_group_challenge_attempt(uuid,integer) to authenticated;

-- Classroom management: only profiles with role teacher can create classrooms.
create or replace function public.create_classroom(p_name text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_code text; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  if not exists(select 1 from public.profiles where id=v_user and role in ('teacher','admin')) then
    raise exception 'Teacher access is required.';
  end if;
  if char_length(trim(p_name)) not between 2 and 70 then raise exception 'Classroom name must be 2–70 characters.'; end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text),1,8));
  insert into public.classrooms(name,teacher_id,join_code) values(trim(p_name),v_user,v_code) returning id into v_id;
  return jsonb_build_object('classroom_id',v_id,'join_code',v_code);
end;
$$;
revoke all on function public.create_classroom(text) from public, anon;
grant execute on function public.create_classroom(text) to authenticated;

create or replace function public.join_classroom(p_join_code text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_class uuid; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  select id into v_class from public.classrooms where join_code=upper(trim(p_join_code));
  if v_class is null then raise exception 'No classroom found for that code.'; end if;
  insert into public.classroom_members(classroom_id,student_id) values(v_class,v_user) on conflict do nothing;
  return v_class;
end;
$$;
revoke all on function public.join_classroom(text) from public, anon;
grant execute on function public.join_classroom(text) to authenticated;

-- Class owners can see aggregate + topic-level attempt data for members in their own classes.
create or replace function public.get_class_metrics(p_classroom_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid := (select auth.uid()); v_total integer; v_correct integer; v_students integer; v_topics jsonb;
begin
  if v_user is null or not exists(select 1 from public.classrooms where id=p_classroom_id and teacher_id=v_user) then
    raise exception 'You are not authorised to view this classroom.';
  end if;
  select count(*) into v_students from public.classroom_members where classroom_id=p_classroom_id;
  select count(*),count(*) filter(where a.is_correct)
    into v_total,v_correct
    from public.attempts a
    join public.classroom_members cm on cm.student_id=a.user_id
    where cm.classroom_id=p_classroom_id;
  select coalesce(jsonb_agg(jsonb_build_object('subject',x.subject,'accuracy',x.accuracy)), '[]'::jsonb)
  into v_topics
  from (
    select a.subject,round(100.0*count(*) filter(where a.is_correct)/nullif(count(*),0))::integer as accuracy
    from public.attempts a
    join public.classroom_members cm on cm.student_id=a.user_id
    where cm.classroom_id=p_classroom_id
    group by a.subject
  ) x;
  return jsonb_build_object('students',v_students,'attempts',v_total,'accuracy',case when v_total=0 then null else round(100.0*v_correct/v_total)::integer end,'topic_breakdown',v_topics);
end;
$$;
revoke all on function public.get_class_metrics(uuid) from public, anon;
grant execute on function public.get_class_metrics(uuid) to authenticated;

-- Daily AI quota. The Edge Function calls this only after validating the user's JWT.
create or replace function public.consume_ai_quota()
returns integer language plpgsql security definer set search_path=''
as $$
declare v_user uuid := (select auth.uid()); v_count integer;
begin
  if v_user is null then raise exception 'Sign in first.'; end if;
  insert into private.ai_daily_usage(user_id,usage_date,request_count)
  values(v_user,current_date,1)
  on conflict(user_id,usage_date) do update
    set request_count=private.ai_daily_usage.request_count+1
  returning request_count into v_count;
  if v_count>40 then raise exception 'Daily study-buddy limit reached. Try again tomorrow.'; end if;
  return v_count;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;

-- Enable Realtime for group messages. If already added, ignore duplicate publication errors.
do $$
begin
  alter publication supabase_realtime add table public.group_messages;
  alter publication supabase_realtime add table public.group_challenges;
  alter publication supabase_realtime add table public.group_challenge_attempts;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- Seed questions. Correct answers and explanations are deliberately separated into private.question_keys.
with q as (
  insert into public.questions(subject,topic,prompt,options,difficulty,hint) values
  ('Computer Science','Data Structures','Which data structure follows the Last In, First Out (LIFO) principle?','["Queue","Stack","Linked list","Tree"]'::jsonb,'easy','Imagine adding and removing plates from the top of a pile.'),
  ('Computer Science','Data Structures','A browser lets you return to the page visited immediately before the current one. Which structure is a natural fit for Back history?','["Queue","Stack","Binary search tree","Hash table"]'::jsonb,'medium','The most recently visited page should be retrieved first.'),
  ('Computer Science','Algorithms','An algorithm checks every item in a list of n items exactly once. What is its time complexity?','["O(1)","O(log n)","O(n)","O(n²)"]'::jsonb,'hard','If the list doubles in size, how many checks will be performed?'),
  ('Computer Science','Data Structures','A food-delivery app processes orders in the order they arrive. Which structure best matches this requirement?','["Stack","Queue","Graph","Heap"]'::jsonb,'medium','The first order received should be the first order handled.'),
  ('Mathematics','Percentages','What is 15% of 200?','["15","20","30","45"]'::jsonb,'easy','10% of 200 is 20. What is 5%?'),
  ('Mathematics','Algebra','If 3x + 5 = 20, what is x?','["3","5","7","15"]'::jsonb,'medium','Subtract 5 from both sides, then divide by 3.'),
  ('Mathematics','Percentages','A ₹800 item is discounted by 25%. What is its sale price?','["₹500","₹550","₹600","₹650"]'::jsonb,'medium','A 25% discount means paying 75% of the original price.'),
  ('Mathematics','Geometry','A rectangle has a perimeter of 30 cm and length 9 cm. What is its width?','["5 cm","6 cm","7 cm","12 cm"]'::jsonb,'hard','Divide the perimeter by 2 before subtracting the length.'),
  ('Physics','Electricity','What is the SI unit of electric current?','["Volt","Ohm","Ampere","Watt"]'::jsonb,'easy','Its symbol is A.'),
  ('Physics','Electricity','If voltage stays constant and resistance doubles, what happens to current?','["It doubles","It halves","It stays the same","It becomes zero"]'::jsonb,'medium','Rearrange Ohm’s law to I = V/R.'),
  ('Physics','Mechanics','A car travels 150 km in 3 hours at constant speed. How far will it travel in 5 hours?','["200 km","225 km","250 km","300 km"]'::jsonb,'hard','Find the distance covered in one hour first.'),
  ('Physics','Electricity','A 12 V battery is connected across a 4 Ω resistor. What current flows?','["2 A","3 A","4 A","48 A"]'::jsonb,'medium','Current = Voltage ÷ Resistance.'),
  ('Biology','Cell Biology','Which organelle is commonly called the powerhouse of the cell?','["Nucleus","Ribosome","Mitochondrion","Golgi apparatus"]'::jsonb,'easy','It helps produce ATP, the cell’s usable energy currency.'),
  ('Biology','Photosynthesis','What is the primary pigment involved in capturing light for photosynthesis?','["Haemoglobin","Chlorophyll","Melanin","Keratin"]'::jsonb,'medium','It is found in chloroplasts.'),
  ('Biology','Plant Physiology','Why might a plant kept in darkness for a long time become pale?','["It produces extra chlorophyll","Chlorophyll production is reduced","Roots stop absorbing water instantly","Its cells stop dividing permanently"]'::jsonb,'medium','The green pigment depends on conditions that support its formation.'),
  ('Biology','Genetics','If a DNA sample contains 20% adenine, approximately what percentage is guanine?','["20%","30%","40%","60%"]'::jsonb,'hard','A pairs with T, and G pairs with C. All four percentages total 100%.')
  returning id,subject,topic,prompt
)
insert into private.question_keys(question_id,correct_index,explanation)
select q.id, x.correct_index, x.explanation
from q
join lateral (
  select case q.prompt
    when 'Which data structure follows the Last In, First Out (LIFO) principle?' then 1
    when 'A browser lets you return to the page visited immediately before the current one. Which structure is a natural fit for Back history?' then 1
    when 'An algorithm checks every item in a list of n items exactly once. What is its time complexity?' then 2
    when 'A food-delivery app processes orders in the order they arrive. Which structure best matches this requirement?' then 1
    when 'What is 15% of 200?' then 2
    when 'If 3x + 5 = 20, what is x?' then 1
    when 'A ₹800 item is discounted by 25%. What is its sale price?' then 2
    when 'A rectangle has a perimeter of 30 cm and length 9 cm. What is its width?' then 1
    when 'What is the SI unit of electric current?' then 2
    when 'If voltage stays constant and resistance doubles, what happens to current?' then 1
    when 'A car travels 150 km in 3 hours at constant speed. How far will it travel in 5 hours?' then 2
    when 'A 12 V battery is connected across a 4 Ω resistor. What current flows?' then 1
    when 'Which organelle is commonly called the powerhouse of the cell?' then 2
    when 'What is the primary pigment involved in capturing light for photosynthesis?' then 1
    when 'Why might a plant kept in darkness for a long time become pale?' then 1
    when 'If a DNA sample contains 20% adenine, approximately what percentage is guanine?' then 1
  end as correct_index,
  'Explanation will be shown after submission.'::text as explanation
) x on true;
-- Replace explanations in a separate prompt-keyed mapping so the answer key stays private.
update private.question_keys k set explanation = case q.prompt
  when 'Which data structure follows the Last In, First Out (LIFO) principle?' then 'A stack follows LIFO: the last item pushed is the first one popped. A real-world example is a stack of plates or undo history.'
  when 'A browser lets you return to the page visited immediately before the current one. Which structure is a natural fit for Back history?' then 'A stack is suitable because the most recent page is at the top. Pressing Back pops the latest page from the history stack.'
  when 'An algorithm checks every item in a list of n items exactly once. What is its time complexity?' then 'The number of checks grows proportionally with n, so the time complexity is O(n).'
  when 'A food-delivery app processes orders in the order they arrive. Which structure best matches this requirement?' then 'A queue follows FIFO (First In, First Out), matching the requirement that the earliest arriving order is processed first.'
  when 'What is 15% of 200?' then '15% = 0.15, and 0.15 × 200 = 30. You can also add 10% (20) and 5% (10).'
  when 'If 3x + 5 = 20, what is x?' then '3x + 5 = 20 → 3x = 15 → x = 5.'
  when 'A ₹800 item is discounted by 25%. What is its sale price?' then '₹800 × 0.75 = ₹600. The discount is ₹200, leaving ₹600 to pay.'
  when 'A rectangle has a perimeter of 30 cm and length 9 cm. What is its width?' then '30 = 2(9 + w), so 15 = 9 + w. Therefore w = 6 cm.'
  when 'What is the SI unit of electric current?' then 'The SI unit of electric current is the ampere (A), named after André-Marie Ampère.'
  when 'If voltage stays constant and resistance doubles, what happens to current?' then 'With fixed voltage, current is inversely proportional to resistance. Doubling resistance halves the current.'
  when 'A car travels 150 km in 3 hours at constant speed. How far will it travel in 5 hours?' then 'Speed = 150 ÷ 3 = 50 km/h. In 5 hours, distance = 50 × 5 = 250 km.'
  when 'A 12 V battery is connected across a 4 Ω resistor. What current flows?' then 'I = V/R = 12/4 = 3 A, according to Ohm’s law.'
  when 'Which organelle is commonly called the powerhouse of the cell?' then 'Mitochondria generate much of the ATP used by eukaryotic cells through cellular respiration.'
  when 'What is the primary pigment involved in capturing light for photosynthesis?' then 'Chlorophyll absorbs light energy, especially in the blue and red regions, to drive photosynthesis.'
  when 'Why might a plant kept in darkness for a long time become pale?' then 'Without light, chlorophyll formation is reduced and existing chlorophyll may break down, causing leaves to appear pale or yellow.'
  when 'If a DNA sample contains 20% adenine, approximately what percentage is guanine?' then 'A = 20%, so T = 20%. The remaining 60% is shared equally by G and C, giving G = 30%.'
  else k.explanation end
from public.questions q where q.id=k.question_id;

-- Give required table permissions; RLS remains the actual row-level gate.
grant usage on schema public to authenticated;
grant select on public.profiles,public.questions,public.attempts,public.groups,public.group_members,public.group_messages,public.group_challenges,public.group_challenge_attempts,public.classrooms,public.classroom_members to authenticated;
grant insert on public.group_messages,public.group_challenges to authenticated;
revoke all on function public.is_group_member(uuid) from public,anon;
revoke all on function public.is_class_teacher(uuid) from public,anon;
revoke all on function public.can_view_profile(uuid) from public,anon;
grant execute on function public.is_group_member(uuid),public.is_class_teacher(uuid),public.can_view_profile(uuid) to authenticated;
