# Language Cards Visual Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести утверждённую систему Forest / Matcha / Paper из интерактивного прототипа во все экраны рабочего Telegram Mini App без изменения серверных контрактов и правил обучения.

**Architecture:** Существующие feature-компоненты сохраняют ответственность за данные и сценарии, а общая визуальная система формируется через семантические CSS-токены, небольшие UI-примитивы и единые классы компоновки. Навигация остаётся трёхсекционной, повторение — отдельным экраном, импорт и редактор — вложенными рабочими областями. Новых frontend-зависимостей и backend-изменений нет.

**Tech Stack:** React 19, TypeScript 5.9, CSS, Vitest + Testing Library, Playwright, Telegram Mini Apps bridge.

**Spec:** `docs/superpowers/specs/2026-10-15-visual-design.md`

## Global Constraints

- Сохранить все AC01–AC19 и API-контракты утверждённой продуктовой спецификации.
- На учебной карточке отображаются только вопрос и раскрываемый ответ; оценки находятся снаружи.
- Не добавлять письменный ответ, напоминания, таймер, дневную норму, серии, XP или рейтинги.
- Общую цель импорта и создания показывать только при `canAddShared && groupId`.
- Палитра, размеры, радиусы и состояния соответствуют Forest / Matcha / Paper; Telegram-тема и safe area продолжают применяться.
- Минимальная зона нажатия — 44 × 44 px; поля имеют размер шрифта не меньше 16 px.
- На ширинах 320, 390 и 480 px не должно быть горизонтального переполнения.
- Анимации отключаются при `prefers-reduced-motion: reduce`.
- Новые библиотеки UI и иконок не добавлять; SVG-иконки реализовать локально с `currentColor`.

## Review Focus

- Очень длинные вопрос и ответ должны переноситься, а оценки оставаться достижимыми — покрывает Task 3 и Task 6.
- Telegram может прислать неконтрастную палитру — bridge обязан перейти на согласованную резервную пару — покрывает Task 1.
- Участник и владелец без права издателя не должны увидеть общую цель — покрывает Task 4 и Task 5.
- Сетевая ошибка оценки не должна закрывать ответ или создавать новый operation key — покрывает Task 3.
- Пустой словарь, пустая очередь и ошибка загрузки должны давать понятный следующий шаг — покрывает Task 2–4.

---

### Task 1: Design tokens, icons and navigation shell

**Files:**
- Create: `frontend/src/components/Icon.tsx`
- Create: `frontend/src/components/Tabs.test.tsx`
- Modify: `frontend/src/components/Tabs.tsx`
- Modify: `frontend/src/components/Button.tsx`
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/styles/global.css`
- Modify: `frontend/src/telegram/bridge.ts`
- Modify: `frontend/src/telegram/bridge.test.ts`

**Interfaces:**
- Produces: `Icon({ name, size?, className? })`, button variants through class names, semantic tokens `--color-border`, `--color-subtle`, `--color-highlight`, `--color-selected`, rating surfaces.
- Consumes: existing `AppSection`, Telegram `themeParams`, safe-area CSS variables.

- [ ] **Step 1: Write failing tests** for Forest / Matcha fallback values and accessible icon-backed tabs whose selected section retains `aria-current="page"`.
- [ ] **Step 2: Run tests to verify RED** with `npm test -- --run src/telegram/bridge.test.ts src/components/Tabs.test.tsx`.
- [ ] **Step 3: Implement the design primitives** without external dependencies; retain text labels as accessible names.
- [ ] **Step 4: Run focused tests to verify GREEN** with the same command.
- [ ] **Step 5: Run the frontend unit suite** with `npm test -- --run`.
- [ ] **Step 6: Commit** `feat: add forest design system primitives`.

### Task 2: App shell and study home

**Files:**
- Create: `frontend/src/features/learning/StudyHome.test.tsx`
- Create: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/features/learning/StudyHome.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**
- Produces: `StudyHome({ groupId, groupName, displayName, onStart, onChooseGroup, onAddWords })` and app-level navigation callbacks.
- Consumes: `getLearningSummary(groupId)`, `listCards({ groupId })`, `Actor.display_name`, active `GroupView`.

- [ ] **Step 1: Write failing tests** proving the hero shows due/new task counts, shared/personal source counts, loading failure retry, selected-set action, and add-words navigation.
- [ ] **Step 2: Run focused tests to verify RED** with `npm test -- --run src/features/learning/StudyHome.test.tsx src/App.test.tsx`.
- [ ] **Step 3: Implement the greeting, selector, hero, source summary and empty/error states** while keeping all counts server-backed.
- [ ] **Step 4: Run focused tests to verify GREEN** with the same command.
- [ ] **Step 5: Run the frontend unit suite** with `npm test -- --run`.
- [ ] **Step 6: Commit** `feat: redesign study home`.

### Task 3: Review and completion flow

**Files:**
- Modify: `frontend/src/features/learning/ReviewPage.test.tsx`
- Modify: `frontend/src/features/learning/ReviewPage.tsx`
- Modify: `frontend/src/components/FlashCard.tsx`
- Modify: `frontend/src/components/RatingControls.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**
- Produces: `ReviewPage({ groupId, onExit, onOpenWords, onAddWords })` with explicit finish header and completion actions.
- Consumes: existing idempotent `submitReview`, Telegram BackButton, `FlashCard`, `RatingControls`.

- [ ] **Step 1: Write failing tests** for the finish action, two completion actions, symbolic four-rating controls, and the existing open-answer retry behavior.
- [ ] **Step 2: Run focused tests to verify RED** with `npm test -- --run src/features/learning/ReviewPage.test.tsx src/components/FlashCard.test.tsx`.
- [ ] **Step 3: Implement the full-screen review layout and calm completion state** without adding metadata inside the card.
- [ ] **Step 4: Run focused tests to verify GREEN** with the same command.
- [ ] **Step 5: Run the frontend unit suite** with `npm test -- --run`.
- [ ] **Step 6: Commit** `feat: redesign review flow`.

### Task 4: Dictionary and card editor

**Files:**
- Create: `frontend/src/components/ActionSheet.tsx`
- Create: `frontend/src/components/ActionSheet.test.tsx`
- Modify: `frontend/src/features/cards/WordListPage.test.tsx`
- Modify: `frontend/src/features/cards/WordListPage.tsx`
- Modify: `frontend/src/features/cards/CardEditor.tsx`
- Modify: `frontend/src/components/ConfirmDialog.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**
- Produces: accessible `ActionSheet({ title, open, onClose, children, returnFocusRef })`; compact dictionary rows and visual editor panel.
- Consumes: existing card CRUD, `can_edit`, `can_delete`, `visibility` and group publishing permission.

- [ ] **Step 1: Write failing tests** for filter tabs, search reset behavior, Escape/focus restoration in the add sheet, scope labels, and role-gated shared creation.
- [ ] **Step 2: Run focused tests to verify RED** with `npm test -- --run src/components/ActionSheet.test.tsx src/features/cards/WordListPage.test.tsx`.
- [ ] **Step 3: Implement the compact searchable dictionary, add-action sheet and styled editor** while preserving version-conflict recovery.
- [ ] **Step 4: Run focused tests to verify GREEN** with the same command.
- [ ] **Step 5: Run the frontend unit suite** with `npm test -- --run`.
- [ ] **Step 6: Commit** `feat: redesign dictionary and editor`.

### Task 5: Import and group screens

**Files:**
- Modify: `frontend/src/features/imports/ImportPage.test.tsx`
- Modify: `frontend/src/features/imports/ImportPage.tsx`
- Modify: `frontend/src/features/groups/GroupPage.test.tsx`
- Modify: `frontend/src/features/groups/GroupPage.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**
- Produces: visual import steps with row status semantics and group cards with role-correct actions.
- Consumes: existing preview/commit idempotency, group membership and invitation APIs.

- [ ] **Step 1: Write failing tests** for the static personal destination, publisher-only segmented target, valid/duplicate/error row labels, selected-count CTA, owner invite, member leave, and absent foreign progress.
- [ ] **Step 2: Run focused tests to verify RED** with `npm test -- --run src/features/imports/ImportPage.test.tsx src/features/groups/GroupPage.test.tsx`.
- [ ] **Step 3: Implement import and group visual structures** without weakening server-backed role decisions or retry behavior.
- [ ] **Step 4: Run focused tests to verify GREEN** with the same command.
- [ ] **Step 5: Run the frontend unit suite** with `npm test -- --run`.
- [ ] **Step 6: Commit** `feat: redesign import and groups`.

### Task 6: Responsive integration and visual verification

**Files:**
- Create: `frontend/e2e/visual-design.spec.ts`
- Modify: `frontend/e2e/app.spec.ts`
- Modify: `frontend/e2e/failure-recovery.spec.ts`
- Modify: `frontend/src/styles/global.css`
- Modify: `docs/superpowers/specs/2026-10-15-visual-design.md`

**Interfaces:**
- Produces: acceptance coverage for widths 320/390/480 and light/dark themes, plus final approved spec status.
- Consumes: all UI contracts from Tasks 1–5 and existing Docker-backed Playwright setup.

- [ ] **Step 1: Write failing browser assertions** for all seven screen states, no horizontal overflow, visible primary actions, long-card wrapping, and both theme token sets.
- [ ] **Step 2: Run the visual browser test to verify RED** with `npm run test:e2e -- visual-design.spec.ts` against the documented test stack.
- [ ] **Step 3: Apply the smallest responsive CSS and selector updates** needed for acceptance; update the visual spec status to implemented.
- [ ] **Step 4: Run the complete verification set**: `npm test -- --run`, `npm run build`, and `npm run test:e2e`.
- [ ] **Step 5: Commit** `test: verify forest interface across app`.

