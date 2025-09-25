# AI Agent Dashboard – Assessment Solution

## Overview
This project is a **Next.js 15 + TypeScript** dashboard application built for the **AI Agent Dashboard Candidate Assignment**.  
It demonstrates authentication, a protected dashboard, a chat tool with mocked LLM responses, and a data analysis tool for CSV/JSON uploads — all using **mocked APIs** for offline reliability.

---

## Tech Stack
- **Next.js 15+ (App Router)**  
- **TypeScript**  
- **Zustand** (state management)  
- **shadcn/ui** (UI components & Tailwind styling)  
- **MSW (Mock Service Worker)** (mocked backend APIs)  
- **React Testing Library + Node test runner** (unit tests)  
- **Playwright** (e2e tests)

---

## Design Notes

### Component Structure
- **app/** → Next.js routes (`/login`, `/dashboard`, `/tools/chat`, `/tools/analysis`).  
- **components/** → Shared UI (`Navbar`, `ToolCard`, `MessageBubble`, `FileUpload`, etc.).  
- **store/** → Zustand stores (`authStore`, `userStatsStore`, `chatStore`, `analysisStore`).  
- **mocks/** → MSW handlers for login, chat, and analysis APIs.  
- **tests/** → Unit and e2e test files.  

### State Strategy (Zustand)
- **authStore** → manages login/logout state.  
- **userStatsStore** → tracks usage stats (queries, files analyzed).  
- **chatStore** → manages chat messages, loading, errors.  
- **analysisStore** → manages file upload, analysis results, selected model.  

### Caching Approach
- No heavy caching needed since mocks are deterministic.  
- Zustand keeps session and tool states in-memory during navigation.  

### Error Handling
- **Auth errors** → invalid credentials → error banner.  
- **Chat errors** → show retry button if mock API fails.  
- **Analysis errors** → invalid file type or empty dataset → user-friendly error.  
- **Fallbacks** → loading states, truncated long responses, safe markdown rendering.

---

## Mocks & API Swapping

### How Mocks Work
- All backend endpoints (`/api/login`, `/api/chat`, `/api/analyze`) are intercepted by **MSW**.  
- MSW returns mock responses for:
  - **Auth** (login/logout with fixed credentials).  
  - **Chat** (mock LLM responses, including simple calculator & weather lookup).  
  - **Analysis** (mock summary, KPIs, and chart data).  
- Mock responses also simulate:
  - **Delays** → loading indicators can be tested.  
  - **Errors** → fallback and retry UI.  
  - **Large responses** → truncation/pagination handling.  

### Switching to Real APIs
If you want to connect to real APIs instead of mocks:
1. Replace MSW handlers in `mocks/handlers.ts` with real API calls inside `lib/api.ts`.  
2. Control the behavior using an environment variable in `.env.local`.  

Example:
```bash
# .env.local
USE_MOCKS=true   # run with MSW mocks
USE_MOCKS=false  # connect to real APIs
```

## Running Locally
To run the project locally, do the following:
```bash
git clone https://github.com/TheAkindele/unic-assesment-solution.git
cd unic-assesment-solution
npm install
npm run dev
```

## Testing
To run all test, use the command
```bash
npm test
```
- To run the unit test only, use the command
```bash
npm run test:unit
```
- To run the e2e test only, use the command
```bash
npm run test:e2e
```

## Sample Data

A sample CSV file is included in the project for testing the **Data Analysis Tool**.

- **Filename:** `sample_sales.csv`  
- **Location in app:** `/public/sample-data/sample_sales.csv`  
- **Download link:** [Click here to download sample_sales.csv](./public/sample-data/sample_sales.csv)  

To use it:
1. Log in and navigate to the **Data Analysis Tool** (`/tools/analysis`).
2. Upload the downloaded `sample_sales.csv` file.
3. The app will display summary insights, KPIs, and a chart/table.

## Deployment
The app has been deployed on vercel and the live demo can be access here 
<a href="https://unic-assesment-solution.vercel.app/" target="_blank">AI Agent Dashboard</a>

