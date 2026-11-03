# Thinkwise Product — Full-stack MVP

Thinkwise is an AI-assisted active-learning platform based on the CA1 solution concept. It turns the assignment's ideas into a multi-user product:

- **Try-first quizzes:** students submit an answer before seeing correctness and explanations.
- **Hints, not answer dumps:** every question can reveal a nudge without revealing the solution.
- **Adaptive practice:** the starting difficulty is selected from recent performance for the chosen subject.
- **Progress analytics:** attempts and accuracy are stored against the signed-in account.
- **AI study buddy:** a secure Supabase Edge Function calls Gemini using a hint-first tutoring instruction.
- **Real study groups:** invite codes, membership, realtime group chat, and one-attempt team challenges using the shared question bank.
- **Teacher space:** verified teacher accounts create classrooms and view aggregates for their enrolled students.
- **Private answer keys:** correct answers/explanations live in a non-exposed `private` schema. The browser calls a constrained SQL RPC to submit an answer.

## Hosting architecture

This is **not a GitHub Pages-only site**. GitHub Pages serves static files; this product needs authenticated database access, server-side AI secrets, and realtime messaging. Recommended setup:

- Frontend: Vite + React hosted on Vercel (or Netlify).
- Backend: Supabase Auth + PostgreSQL + Row Level Security + Realtime + Edge Functions.
- AI: Gemini API called only from the Edge Function.

The browser contains only the Supabase publishable/anon key. RLS protects exposed tables; the Supabase service-role key and Gemini key must never be added to frontend variables.

## 1. Create a Supabase project

Create a project at https://supabase.com/dashboard.

In **Project Settings → API**, copy:
- Project URL
- Publishable key (or legacy anon key)

Copy `.env.example` to `.env.local`, then fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

## 2. Create database and sample questions

Open **SQL Editor** in the Supabase dashboard and run the full file:

`supabase/migrations/001_init.sql`

This creates the schema, RLS policies, guarded RPCs, trigger, realtime publication entry, and sample question bank.

The SQL gives every new account the `student` role. To promote a verified educator, first have that person sign up. Then, as the project owner, run:

```sql
update public.profiles
set role = 'teacher'
where id = 'THE_AUTH_USER_UUID';
```

Find the UUID in **Authentication → Users**. The app intentionally does not let users self-assign the teacher role.

## 3. Configure the AI study buddy

Create a Gemini API key in Google AI Studio. Then set Edge Function secrets in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your_private_key
supabase secrets set GEMINI_MODEL=gemini-3.8-flash
```

Optional: restrict browser calls to your deployed domain:

```bash
supabase secrets set APP_ORIGIN=https://your-app-domain.example
```

Deploy the Edge Function from the project folder:

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy study-buddy
```

If using the Dashboard instead, deploy `supabase/functions/study-buddy/index.ts` as an Edge Function and configure the same secrets. Do not place `GEMINI_API_KEY` in `.env.local` or any `VITE_` variable.

The tutor function validates the user's Supabase session and enforces a 40-request daily quota per user through the database RPC. Gemini model availability and pricing are controlled by Google and may change; update `GEMINI_MODEL` to a model available to your account if needed.

## 4. Run locally

Requires Node.js 20.19+ or 22.12+ (Vite 7 runtime requirement).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Create a student account. If email confirmation is enabled in Supabase Auth, verify the email before signing in.

Build check:

```bash
npm run build
npm run preview
```

## 5. Deploy frontend

### GitHub Pages (included workflow)

The repository includes `.github/workflows/deploy-pages.yml`, so GitHub can build and host the frontend while Supabase continues to run the database, authentication, realtime, and AI function.

1. Push the project to a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Secrets and variables → Actions** and create these repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
4. Push a commit (or manually run the workflow from the Actions tab).
5. Add the resulting Pages URL to Supabase Auth → URL Configuration / redirect URLs. If you set the Edge Function `APP_ORIGIN`, use the same exact origin.

GitHub Pages hosts only the static frontend. The Supabase project and Edge Function remain required for sign-in, database persistence, group chat, and AI tutoring.

### Vercel



1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Set the root directory to the project root.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel Project Environment Variables.
5. Deploy.

Vite's build output is `dist`. Vercel detects Vite automatically. Add your production domain to Supabase Auth → URL Configuration and allowed redirect URLs.

### Netlify

Build command: `npm run build`  
Publish directory: `dist`

Add the same two frontend environment variables in Netlify, then deploy.

## 6. Product roles and data access

- All signed-in users can read active question prompts/options/hints.
- Correct answer keys are in `private.question_keys`; browser roles have no access.
- `submit_attempt` reads the private key and records the result using `auth.uid()`.
- Users can only read their own attempts.
- Group messages, group challenges, and challenge attempts are visible to group members only; message/challenge creation and challenge submissions are membership-checked.
- Teacher class creation and class metrics are verified on the database side.
- Teacher role assignment is an administrative action, not a public signup option.
- The study buddy's API key stays in Supabase Edge Function secrets. Chat messages submitted to the study buddy are sent to the Gemini API configured by the project owner; users should not share passwords, sensitive personal information, or confidential records in tutor chats.

## Important launch checklist

This is a working **MVP foundation**, not a fully audited, production-certified education service. Before inviting real students or charging money, complete:

- Domain allowlist, email templates, and recovery/verification testing.
- Abuse prevention and stronger per-IP/user AI rate limiting.
- Content review and expansion of the question bank to match the institution's syllabus.
- Accessibility testing with keyboard and screen readers.
- Privacy policy, retention/deletion workflows, consent and age-appropriate safeguards.
- Teacher onboarding and student/class enrolment workflows.
- Backups, monitoring, error reporting, and load/security testing.
- Billing controls and usage budgets for the AI provider.

## Current MVP boundaries

- Quiz bank contains a small set of sample MCQs across four subjects. Extend it with reviewed course-aligned questions.
- Adaptive difficulty uses a simple recent-accuracy heuristic. It is not a validated learning-science model.
- Tutor is live Gemini, but generated explanations can still be wrong. Keep the verification reminder.
- Group collaboration supports invite-code membership, realtime text chat, and shared one-question team challenges with a simple correct/attempted scoreboard. It does not yet include voice/video or multi-round team tournaments.
- Teacher dashboard provides aggregate class metrics. It does not yet offer assignment authoring, gradebook exports, or individual intervention histories.
- No real student names or records are preloaded; teacher data only appears after real accounts join classes.

## Project structure

```text
thinkwise-product/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   └── lib/supabase.js
└── supabase/
    ├── migrations/001_init.sql
    └── functions/study-buddy/index.ts
```
