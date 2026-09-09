> **Authentication update:** Read [AUTH_SETUP.md](AUTH_SETUP.md) for Google/phone sign-in configuration, database migration, and public registration changes.

> **Frontend refreshed:** See [FRONTEND_UPDATE.md](FRONTEND_UPDATE.md) for current setup and changes. Demo shortcuts are removed and automatic sample-data seeding is disabled. Any demo setup instructions below describe the original version.

# Synora — AI-Powered Dynamic Mental Health Monitoring & Cross-Sensing Early Warning Platform

> **AI-Assisted Risk Indication — Not a Medical Diagnosis.**
> Synora is a hackathon/SIH prototype. It is a screening and decision-support system for qualified
> professionals. It never diagnoses, never automates clinical intervention, and never exposes
> individual risk analytics to the victim.

Synora analyzes **permitted interactions only** (text check-ins, optional voice notes, basic
interaction-metadata patterns), compares every signal against the **individual's own personal
baseline** (never a population norm), tracks risk as a **temporal trajectory**, and fuses everything
through a **cross-sensing engine** into one explainable, dynamic risk indication that always routes
to **human review**.

---

## 1. Architecture

```
┌──────────────────────────────  FRONTEND (React 19 + Vite)  ─────────────────────────────┐
│  Landing page      Victim mobile app (bottom nav)      Counselor / Officer / Admin      │
│  /login /register  Home·Check-in·History·Support·Profile  command-center dashboards      │
│                   centralized API layer (axios + JWT interceptor)                        │
└──────────────────────────────────────────┬───────────────────────────────────────────────┘
                                           │ REST /api  (JWT Bearer)
┌──────────────────────────────────────────▼───────────────────────────────────────────────┐
│                          BACKEND (Spring Boot · Java 17 · Maven)                          │
│  controller/   REST endpoints (auth, cases, monitoring, reports, admin)                   │
│  ai/           AIProvider → OllamaAIProvider | DemoAIProvider (deterministic)             │
│                DeterministicTextAnalyzer · DeterministicVoiceAnalyzer · AIRouter          │
│  engine/       BaselineEngine · TemporalEngine · CrossSensingEngine                       │
│                RiskEngine (weighted, explainable) · AlertEngine (+escalation sweep)       │
│                MonitoringOrchestrationService (full pipeline)                             │
│  security/     JwtService · JwtAuthFilter · RBAC (VICTIM/COUNSELOR/CASE_OFFICER/ADMIN)    │
│  audit/        AuditService → audit_logs table                                            │
│  exception/    Consistent {timestamp,status,error,message,path} errors                    │
└──────────────────────────────────────────┬───────────────────────────────────────────────┘
                                           │ JPA / Hibernate
                                  ┌────────▼────────┐
                                  │   PostgreSQL     │  15+ tables (users, cases, checkins,
                                  └──────────────────┘  analyses, baselines, alerts, followups…)
```

### Cross-sensing pipeline (per check-in)

```
Text ──► NLP distress analysis ─┐
Voice ─► prosody analysis ──────┤
Behavior ─► cadence deviation ──┼──► CrossSensingEngine ──► signal agreement + consistency
Personal baseline ──────────────┤         │
Temporal trend ─────────────────┘         ▼
                          RiskEngine (configurable weights, normalized by present modalities)
                                          │
                          explainable factors + trend + level
                                          │
                          riskScore ≥ alertThreshold ─► AlertEngine ─► counselor dashboard
                                                                        (human decides)
```

## 2. Technology stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19, Vite, React Router 7, Framer Motion, Recharts, Lucide, modern CSS |
| Backend   | Java 17, Spring Boot (Web/Security/Validation/JPA/Actuator/Scheduling), JJWT, Lombok-ready |
| Database  | PostgreSQL (16 in docker-compose, any 14+ works) |
| AI        | Ollama (local LLM, optional) with deterministic demo fallback |

## 3. Quick start

### 3.1 PostgreSQL

```bash
docker compose up -d          # starts postgres:16 with db synora / user synora / pass synora
```

or use a local PostgreSQL:

```sql
CREATE USER synora WITH PASSWORD 'synora' CREATEDB;
CREATE DATABASE synora OWNER synora;
```

### 3.2 Backend

```bash
cd backend
./mvnw spring-boot:run          # http://localhost:8080
```

On first boot the app creates the schema and seeds a rich synthetic demo dataset
(≈129 cases incl. CASE-2031/2042/2057/2071, 562 risk assessments, alerts, follow-ups,
interventions, resources, audit history). Seeding is skipped when data already exists.

### 3.3 Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api → :8080)
```

### 3.4 Optional: Ollama (local LLM)

```bash
ollama pull llama3.2
ollama serve
```

The backend probes Ollama automatically (`AI_PROVIDER=auto`). If it is reachable, text analysis
runs through the local LLM; otherwise the deterministic demo provider is used. Force either with
`AI_PROVIDER=ollama` or `AI_PROVIDER=demo`.

## 4. Environment variables

Copy `.env.example` and adjust. Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/synora` | JDBC URL |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `synora` / `synora` | DB credentials |
| `JWT_SECRET` | dev value (change in prod) | Token signing key (≥32 chars) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local LLM endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Local LLM model |
| `AI_PROVIDER` | `auto` | `auto` \| `ollama` \| `demo` |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Allowed browser origins |

## 5. Demo credentials

All demo accounts share the password **`Demo@12345`** (synthetic data only):

| Role | Email | Lands on |
|---|---|---|
| Counselor | `counselor@demo.synora.ai` | Counselor command center |
| Case Officer | `officer@demo.synora.ai` | Case management |
| Admin | `admin@demo.synora.ai` | Administration |
| Victim | `user@demo.synora.ai` | Victim mobile app (`/app/home`) |

Additional counselors/officers exist (`counselor2@…`, `counselor3@…`, `officer2@…`).

## 6. REST API (base `/api`)

| Method & path | Roles | Purpose |
|---|---|---|
| `POST /auth/register` · `POST /auth/login` | public | JWT auth |
| `GET /health` | public | AI/DB status for the UI indicator |
| `GET /cases` · `GET /cases/{caseNumber}` | role-scoped | Case list/detail (auto-filtered by role) |
| `POST /cases` · `POST /cases/{cn}/assign` · `PATCH /cases/{cn}/status` | OFFICER/ADMIN | Case management |
| `GET /cases/{cn}/timeline` | role-scoped | Chronological audit-derived timeline |
| `POST /analysis/text` | victim/assigned | Text check-in → full pipeline |
| `POST /analysis/voice` | victim/assigned | multipart audio + optional text → full pipeline |
| `POST /analysis/demo-run` | COUNSELOR/OFFICER/ADMIN | Hackathon demo pipeline run |
| `GET /cases/{cn}/risk` · `/risk-history?days=` | role-scoped | Current + historical risk |
| `GET /cases/{cn}/signals` · `/baseline` · `/explainability` | role-scoped | Signal details, personal baseline, factors |
| `GET /alerts` (`?status&severity&caseNumber`) · `GET/PATCH /alerts/{id}` | staff | Alert lifecycle (acknowledge/resolve) |
| `POST /cases/{cn}/interventions` · `GET …/interventions` | staff | Support records |
| `POST /cases/{cn}/followups` · `GET …/followups` · `PATCH /followups/{id}` | staff | Follow-up management |
| `GET/POST /consents` | victim | Per-modality consent (grant/revoke) |
| `GET /me/wellness` | victim | Supportive, non-diagnostic self-view |
| `GET /resources` · `GET /resources/recommended/{cn}` | any authed | Reviewed resources / theme-based recommendations |
| `GET /reports/overview` | OFFICER/ADMIN | Anonymized aggregate analytics |
| `GET /admin/system-health` · `/config` · `/audit-logs` · `/organizations` · `/stats` | ADMIN | Administration |

Errors always follow `{ "timestamp", "status", "error", "message", "path" }`.

## 7. Database schema (principal tables)

```
users ─┬─ cases ─┬─ checkins ─┬─ text_analysis
       │         │            ├─ voice_analysis
       │         ├─ behavioral_signals
       │         ├─ risk_assessments ── alerts
       │         ├─ interventions
       │         └─ followups
       ├─ consents
       └─ audit_logs · resources · notifications
```

UUID primary keys, `created_at`/`updated_at` throughout, FKs enforced by JPA.
Schema is created by Hibernate (`ddl-auto: update`); see `docs/` for the conceptual model.

## 8. AI pipeline & engines

- **Text analysis** — deterministic lexicon analyzer: distress density, themes (sleep, anxiety,
  isolation, case-stress…), sentiment, sleep/urgency indicators. Same input ⇒ same score.
- **Voice analysis** — deterministic prosody proxy from audio byte statistics: energy, variability
  (tremor), pace ⇒ tone indicators + demo transcript snippet. Behind the same `AIProvider` interface.
- **Personal baseline** — mean of the case's historical risk scores; deviation = current − baseline,
  interpreted in supportive language.
- **Temporal engine** — STABLE / RISING / DECLINING / VOLATILE classification from the last deltas,
  producing a temporal score feeding the risk engine.
- **Cross-sensing** — pairwise comparison of available modality scores ⇒ signal agreement (0..1),
  cross-modal deviation, HIGH/MEDIUM/LOW consistency flag.
- **Risk engine** — configurable weights (text .28, voice .20, behavior .16, baseline .14,
  temporal .10, cross-modal .12) **normalized by the weights of modalities actually present**, so a
  text-only check-in is never diluted. Output: score, level, confidence and ranked contributing factors.
- **Alert engine** — dedupes OPEN alerts per case, escalates unacknowledged HIGH/CRITICAL alerts to
  supervisors after a configurable timeout (scheduled sweep every 5 min). Never automates intervention.

Thresholds (0.30 / 0.60 / 0.80 / alert 0.60) are **prototype values, not clinically validated**, and
are viewable in Admin → Configuration.

## 9. Security model & role permissions

- JWT (HS) signed tokens, stateless sessions, BCrypt password hashing.
- RBAC enforced at route + service level; every case access passes `assertCanView`:
  - **VICTIM** → only own cases; never sees risk labels/alerts; supportive language only.
  - **COUNSELOR** → only cases assigned to them; full analytics; alert actions; interventions.
  - **CASE_OFFICER** → only cases assigned to them; case lifecycle, summaries, reports.
  - **ADMIN** → user administration, audit logs, config, system health, aggregate analytics.
- Audit logging of security-relevant actions (login, case viewed/created/assigned, risk viewed,
  alert lifecycle, interventions, follow-ups, user updates).
- Consent required per modality and revocable; analysis respects data minimization (missing
  modalities never block or dilute the pipeline).

## 10. Hackathon demo script (3 minutes)

1. **Landing page** — point at the animated cross-sensing hero; "signals in, explainable risk out".
2. **Sign in as Counselor** (one click on the demo card) — command center: metrics, risk
   distribution, avg risk trend, priority queue, open alerts.
3. Open **CASE-2031** → Risk tab: animated gauge, trajectory with threshold lines, personal baseline
   bars. Explain: "we compare her to *her own* baseline, not a population".
4. **Cross-Sensing tab** — the signature visual: text/voice/behavior/baseline/trend flowing into the
   AI core; hover the signals, show agreement + consistency.
5. **Run AI Analysis** (top-right) — full-screen neural pipeline animates 9 stages, then the
   explainable result card + alert generation.
6. **Explainability tab** — "Why did the indication change?" ranked contributing factors.
7. **Alert Center** — acknowledge an alert; show escalation note (30-min timeout).
8. Sign out → **Victim demo** → the same platform from the person's side: warm check-in flow
   (consent → mood → text → voice → patterns), *supportive* feedback, wellness trend, and consent
   revocation in Profile. "The victim never sees scary labels."

## 11. Deployment

```bash
# production build
cd frontend && npm run build          # static bundle in dist/
cd backend  && ./mvnw package         # executable jar in target/
java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=$DATABASE_URL ...
```

Serve `frontend/dist` from any static host/CDN with `/api` proxied to the backend, or place the jar
behind nginx. Provide `JWT_SECRET`, DB credentials and `CORS_ORIGINS` via environment. Health probe:
`GET /api/health`.

## 12. Known limitations

- Prototype/demo thresholds; **not** a medical device and **not** clinically validated.
- Voice analysis uses a deterministic prosody proxy (no real ASR); wired behind `AIProvider` so a
  real model can be dropped in.
- Risk components and their weights are illustrative, tuned for demonstration realism.
- `ddl-auto: update` is convenient for the demo; use migrations (Flyway/Liquibase) in production.
- Seeded data is synthetic; dashboards label demo numbers accordingly.
- Password reset UI is a stub (no email service in the prototype).

## 13. Ethical commitments (implemented, not just promised)

- Every screen that shows a risk figure carries **"AI-Assisted Risk Indication — Not a Medical Diagnosis"**.
- Counselor dashboards carry the full professional disclaimer; the victim app uses supportive,
  non-diagnostic language and never displays risk levels.
- Explicit, granular, revocable consent per modality; data minimization by design; no invasive
  tracking; anonymized aggregates in all reporting; audit trail for accountability.

---

Built as a complete full-stack prototype: React 19 + Vite frontend, Spring Boot backend,
PostgreSQL persistence, pluggable local-AI (Ollama) analysis, explainable risk engine,
cross-sensing visualization, alerting, follow-ups, RBAC, audit logs and 129 seeded demo cases.
