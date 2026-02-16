# ClientV2 Migration Plan

> **Source:** `task-management-app` (Next.js 16 + React 19 + shadcn/ui)  
> **Target:** `ClientV2` (Nuxt 4 + Vue 3 + Nuxt UI 4)  
> **Status:** ⚠️ Core Migration Complete; Hardening & Cleanup In Progress  
> **Last Updated:** February 16, 2026 (re-verified)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Comparison](#2-architecture-comparison)
3. [Completed Migrations](#3-completed-migrations)
4. [Completed Previously-Incomplete Migrations](#4-completed-previously-incomplete-migrations)
5. [Detailed Implementation Tasks](#5-detailed-implementation-tasks)
6. [Testing Checklist](#6-testing-checklist)
7. [Risk Assessment](#7-risk-assessment)
8. [Appendix: File Mapping Reference](#appendix-file-mapping-reference)

---

## 1. Executive Summary

### Migration Overview

| Aspect | Status | Completion |
|--------|--------|------------|
| Types & Interfaces | ✅ Complete | 100% |
| State Management | ✅ Complete | 100% |
| Seed Data & Mocks | ✅ Complete | 100% |
| Utility Functions | ✅ Complete | 100% |
| Core Components | ✅ Complete | 100% |
| Composables/Hooks | ✅ Complete | 100% |
| Styling & Theming | ✅ Complete | 100% |
| Fonts | ✅ Complete | 100% |
| Tests | ⚠️ Partial | 20% |
| Routing & Cleanup | ⚠️ Partial | 60% |

### Critical Blockers (Post-Verification)

1. **Toast workflow integration incomplete** - `ToastContainer` is mounted, but feature flows do not call `useToast()` for task/message feedback.
2. **`useIsMobile` is not wired** - composable exists but is not used by `AppShell`, `Sidebar`, or `ChatHeader`.
3. **Starter-template artifacts remain** - `app/pages/index.vue`, `README.md`, `app/components/TemplateMenu.vue`, and `app/components/AppLogo.vue` still contain Nuxt starter content.
4. **Routing architecture mismatch** - `app/app.vue` renders `AppShell` directly and does not render `<NuxtPage />`, so `app/pages/index.vue` mapping is currently misleading.

---

## 2. Architecture Comparison

### Technology Stack

| Layer | task-management-app | ClientV2 |
|-------|---------------------|----------|
| Framework | Next.js 16 (App Router) | Nuxt 4 |
| UI Library | React 19 | Vue 3 (Composition API) |
| Component Library | shadcn/ui (Radix UI) | Nuxt UI 4 |
| CSS Framework | Tailwind CSS 3 | Tailwind CSS 4 |
| State Management | React Context + useReducer | useState + computed |
| Type System | TypeScript | TypeScript |
| Icons | lucide-react | @nuxt/icon (lucide) |

### Directory Structure Mapping

```
task-management-app/                    ClientV2/
├── app/                               ├── app/
│   ├── globals.css                    │   ├── assets/css/main.css
│   ├── layout.tsx        ───────────► │   ├── app.vue
│   └── page.tsx                       │   └── pages/index.vue
├── components/                        ├── app/components/
│   ├── ui/ (45 files)    ───────────► │   (Nuxt UI built-in)
│   ├── chat/             ───────────► │   chat/
│   ├── sidebar/          ───────────► │   sidebar/
│   ├── task/             ───────────► │   task/
│   ├── shared/           ───────────► │   shared/
│   ├── notifications/    ───────────► │   notifications/
│   ├── app-shell.tsx     ───────────► │   AppShell.vue
│   └── theme-provider.tsx             │   (Nuxt UI built-in)
├── lib/                               ├── composables/
│   ├── store.tsx         ───────────► │   useAppStore.ts
│   ├── types.ts          ───────────► │   types/index.ts
│   ├── utils.ts          ───────────► │   utils/index.ts
│   └── seed-data.ts      ───────────► │   data/seed.ts
├── hooks/                             ├── composables/
│   ├── use-mobile.tsx    ───────────► │   useIsMobile.ts ⚠️ (integration pending)
│   └── use-toast.ts      ───────────► │   (Nuxt UI built-in) ⚠️ (feature usage pending)
└── [config files]                    └── [config files]
```

---

## 3. Completed Migrations

### 3.1 Types & Interfaces

**File:** `app/types/index.ts`  
**Source:** `lib/types.ts`  
**Status:** ✅ 100% Identical

| Type | Status | Notes |
|------|--------|-------|
| `UserId` | ✅ | Branded string type |
| `ThreadId` | ✅ | Branded string type |
| `TaskId` | ✅ | Branded string type |
| `MessageId` | ✅ | Branded string type |
| `User` | ✅ | User profile interface |
| `Thread` | ✅ | Conversation thread |
| `Task` | ✅ | Task with full metadata |
| `TaskStatus` | ✅ | 5 status values |
| `TaskPriority` | ✅ | 4 priority levels |
| `Message` | ✅ | Chat message with types |
| `MessageType` | ✅ | 7 message types |
| `TaskTemplate` | ✅ | Template with subtasks |
| `Notification` | ✅ | 5 notification types |
| `AppState` | ✅ | Complete state shape |

### 3.2 State Management

**File:** `app/composables/useAppStore.ts`  
**Source:** `lib/store.tsx`  
**Status:** ✅ 100% Feature Parity

#### Actions (All Migrated)

| Action | Status | Description |
|--------|--------|-------------|
| `SET_ACTIVE_THREAD` | ✅ | Select active conversation |
| `SET_ACTIVE_TASK` | ✅ | Select task for detail view |
| `TOGGLE_SIDEBAR` | ✅ | Toggle mobile sidebar |
| `SET_SIDEBAR` | ✅ | Set sidebar open/closed |
| `SET_SEARCH` | ✅ | Update search query |
| `SHOW_NOTIFICATIONS` | ✅ | Toggle notification panel |
| `SHOW_TASK_FORM` | ✅ | Toggle task creation form |
| `SHOW_TEMPLATES` | ✅ | Toggle template picker |
| `SET_EDITING_TASK` | ✅ | Set task for editing |
| `ADD_THREAD` | ✅ | Create new thread |
| `ADD_TASK` | ✅ | Create task with message |
| `UPDATE_TASK` | ✅ | Update task with optional message |
| `DELETE_TASK` | ✅ | Remove task and subtasks |
| `ADD_MESSAGE` | ✅ | Add chat message |
| `ADD_NOTIFICATION` | ✅ | Create notification |
| `MARK_NOTIFICATION_READ` | ✅ | Mark single notification read |
| `MARK_ALL_NOTIFICATIONS_READ` | ✅ | Mark all notifications read |
| `CLEAR_UNREAD` | ✅ | Clear thread unread count |
| `RESET_STATE` | ✅ | Reset to initial state |

#### Computed Selectors (All Migrated)

| Selector | Status | Returns |
|----------|--------|---------|
| `activeThread` | ✅ | `Thread \| null` |
| `activeTask` | ✅ | `Task \| null` |
| `threadMessages` | ✅ | `Message[]` (sorted) |
| `threadTasks` | ✅ | `Task[]` |
| `unreadNotificationCount` | ✅ | `number` |
| `getUserById(id)` | ✅ | `User \| undefined` |
| `getTaskById(id)` | ✅ | `Task \| undefined` |
| `getSubtasks(parentId)` | ✅ | `Task[]` |

#### Factory Functions (All Migrated)

| Function | Status | Purpose |
|----------|--------|---------|
| `createThread()` | ✅ | Create new thread object |
| `createTask()` | ✅ | Create new task object |
| `createMessage()` | ✅ | Create new message object |
| `createNotification()` | ✅ | Create new notification object |

### 3.3 Seed Data & Mocks

**File:** `app/data/seed.ts`  
**Source:** `lib/seed-data.ts`  
**Status:** ✅ 100% Complete

#### Users (5 records)

| ID | Name | Initials | Color |
|----|------|----------|-------|
| u1 | You | YO | hsl(210 100% 52%) |
| u2 | Sarah Chen | SC | hsl(340 82% 52%) |
| u3 | Alex Rivera | AR | hsl(142 71% 45%) |
| u4 | Jordan Lee | JL | hsl(38 92% 50%) |
| u5 | Morgan Park | MP | hsl(262 83% 58%) |

#### Threads (5 records)

| ID | Name | Type | Category | Pinned |
|----|------|------|----------|--------|
| t1 | Website Redesign | project | Design | ✅ |
| t2 | Mobile App Sprint | project | Engineering | ✅ |
| t3 | Marketing Launch | group | Marketing | ❌ |
| t4 | Sarah Chen | direct | - | ❌ |
| t5 | Bug Triage | project | Engineering | ❌ |

#### Tasks (10 records)

| ID | Title | Status | Priority | Thread |
|----|-------|--------|----------|--------|
| task1 | Design new homepage hero section | in-progress | high | t1 |
| task2 | Set up design system tokens | done | high | t1 |
| task3 | Implement responsive navigation | todo | medium | t1 |
| task4 | Create footer component | todo | low | t1 |
| task5 | Set up React Native project | done | urgent | t2 |
| task6 | Build authentication flow | in-progress | high | t2 |
| task7 | Design app icon and splash screen | review | medium | t2 |
| task8 | Write blog launch announcement | todo | high | t3 |
| task9 | Fix login redirect loop on Safari | blocked | urgent | t5 |
| task10 | Memory leak in dashboard charts | in-progress | high | t5 |

#### Messages (24 records)

Distributed across all 5 threads with various types:
- `system` messages (thread creation)
- `task-created` messages
- `status-change` messages
- `assignment` messages
- `text` messages

#### Templates (4 records)

| ID | Name | Default Priority | Subtasks |
|----|------|------------------|----------|
| tmpl1 | Bug Report | high | 5 subtasks |
| tmpl2 | Feature Request | medium | 4 subtasks |
| tmpl3 | Sprint Task | medium | 4 subtasks |
| tmpl4 | Meeting Action Item | medium | 0 subtasks |

#### Notifications (4 records)

| ID | Type | Read | Task |
|----|------|------|------|
| n1 | assignment | ✅ | task1 |
| n2 | status-change | ❌ | task2 |
| n3 | comment | ❌ | task9 |
| n4 | due-soon | ❌ | task6 |

### 3.4 Utility Functions

**File:** `app/utils/index.ts`  
**Source:** `lib/utils.ts`  
**Status:** ✅ 100% Feature Parity

| Function | Status | Description |
|----------|--------|-------------|
| `twJoin()` | ✅ | Tailwind class joiner (Vue equivalent of `cn()`) |
| `generateId(prefix)` | ✅ | Unique ID generator |
| `relativeTime(dateStr)` | ✅ | Human-readable relative time |
| `formatTime(dateStr)` | ✅ | Time formatting (12-hour) |
| `formatDate(dateStr)` | ✅ | Date formatting (Today/Yesterday/date) |
| `isDueOverdue(dueDate)` | ✅ | Check if task is overdue |
| `isDueSoon(dueDate)` | ✅ | Check if task due within 2 days |
| `STATUS_CONFIG` | ✅ | Task status labels and colors |
| `PRIORITY_CONFIG` | ✅ | Priority labels and colors |

### 3.5 Core Components

#### Application Shell

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| AppShell | `components/app-shell.tsx` | `components/AppShell.vue` | ✅ |
| Root Layout | `app/layout.tsx` | `app/app.vue` | ✅ |

#### Sidebar Components

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| Sidebar | `components/sidebar/sidebar.tsx` | `components/sidebar/Sidebar.vue` | ✅ |
| SidebarHeader | `components/sidebar/sidebar-header.tsx` | `components/sidebar/SidebarHeader.vue` | ✅ |
| ThreadItem | `components/sidebar/thread-item.tsx` | `components/sidebar/ThreadItem.vue` | ✅ |

#### Chat Components

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| ChatView | `components/chat/chat-view.tsx` | `components/chat/ChatView.vue` | ✅ |
| ChatHeader | `components/chat/chat-header.tsx` | `components/chat/ChatHeader.vue` | ✅ |
| InputBar | `components/chat/input-bar.tsx` | `components/chat/InputBar.vue` | ✅ |
| MessageBubble | `components/chat/message-bubble.tsx` | `components/chat/MessageBubble.vue` | ✅ |
| SystemBubble | `components/chat/system-bubble.tsx` | `components/chat/SystemBubble.vue` | ✅ |
| TaskCardBubble | `components/chat/task-card-bubble.tsx` | `components/chat/TaskCardBubble.vue` | ✅ |

#### Task Components

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| TaskFormDrawer | `components/task/task-form-drawer.tsx` | `components/task/TaskFormDrawer.vue` | ✅ |
| TaskDetailDrawer | `components/task/task-detail-drawer.tsx` | `components/task/TaskDetailDrawer.vue` | ✅ |
| TaskTemplatePicker | `components/task/task-template-picker.tsx` | `components/task/TaskTemplatePicker.vue` | ✅ |

#### Shared Components

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| UserAvatar | `components/shared/user-avatar.tsx` | `components/shared/UserAvatar.vue` | ✅ |
| AvatarStack | ❌ Not in source | `components/shared/AvatarStack.vue` | ✅ (Enhanced) |
| StatusBadge | `components/shared/status-badge.tsx` | `components/shared/StatusBadge.vue` | ✅ |
| PriorityBadge | `components/shared/priority-badge.tsx` | `components/shared/PriorityBadge.vue` | ✅ |

#### Notification Components

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| NotificationPanel | `components/notifications/notification-panel.tsx` | `components/notifications/NotificationPanel.vue` | ✅ |

---

## 4. Completed Previously-Incomplete Migrations

### 4.1 Composables

#### `useIsMobile` ✅ Complete

**Source:** `hooks/use-mobile.tsx`  
**Target:** `composables/useIsMobile.ts`  
**Implementation:** Uses `@vueuse/core`'s `useMediaQuery` with 768px breakpoint

**Original Implementation:**
```tsx
// hooks/use-mobile.tsx
import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
```

**Usage in Original App:**
- Determines sidebar visibility behavior
- Controls mobile-specific UI elements
- Affects drawer vs. permanent sidebar display

---

#### `useToast` ✅ Complete (using Nuxt UI built-in)

Nuxt UI provides a built-in `useToast` composable with the following API:

**Original Implementation:** (192 lines)

Key features:
- Toast queue with limit of 1
- Auto-dismiss with configurable delay
- `toast()` function for imperative toast creation
- `useToast()` hook for reactive state access
- Support for title, description, and action buttons

**API:**
```tsx
const { toast, dismiss } = useToast()

toast({
  title: "Task Created",
  description: "Your task has been created successfully",
  action: <ToastAction altText="Undo">Undo</ToastAction>
})
```

**Usage Scenarios in App:**
- Task creation confirmation
- Task update notifications
- Error messages
- Undo actions

---

### 4.2 Styling Features ✅ Complete

#### Custom Fonts ✅

**Source:** Google Fonts (Geist, Geist Mono)  
**Target:** `@fontsource-variable/geist` + `@fontsource-variable/geist-mono`  
**Status:** Configured in `app/assets/css/main.css`

**Original Configuration:**
```tsx
// app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google'

const geist = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })
```

**Required Action:**
- Add @fontsource packages or use Google Fonts
- Configure in `nuxt.config.ts` or CSS

---

#### Viewport Configuration ✅

**Configured in `app/app.vue`:**
```ts
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'theme-color', content: '#121519' }
  ]
})
```

---

#### CSS Variables ✅

**All CSS variables implemented in `app/assets/css/main.css`:**

| Variable | Purpose | Status |
|----------|---------|--------|
| `--background` | Main background | ✅ Complete |
| `--foreground` | Main text color | ✅ Complete |
| `--card` | Card background | ✅ Complete |
| `--popover` | Popover background | ✅ Complete |
| `--muted` | Muted backgrounds | ✅ Complete |
| `--accent` | Accent color | ✅ Complete |
| `--destructive` | Error/delete color | ✅ Complete |
| `--border` | Border color | ✅ Complete |
| `--input` | Input background | ✅ Complete |
| `--ring` | Focus ring color | ✅ Complete |
| `--bubble-own` | Own message bubble | ✅ Complete |
| `--bubble-other` | Other message bubble | ✅ Complete |
| `--sidebar-*` | Sidebar colors | ✅ Complete |
| `--chart-*` | Chart colors | ✅ Complete |

---

### 4.3 UI Components (Replaced by Nuxt UI) ✅

The following shadcn/ui components are NOT migrated because Nuxt UI provides equivalents:

| shadcn/ui Component | Nuxt UI Equivalent | Action Required |
|---------------------|-------------------|-----------------|
| Button | UButton | ✅ None |
| Input | UInput | ✅ None |
| Textarea | UTextarea | ✅ None |
| Select | USelect | ✅ None |
| Dialog | UModal | ✅ None |
| Sheet | USlideover | ✅ None |
| Drawer | USlideover | ✅ None |
| Popover | UPopover | ✅ None |
| DropdownMenu | UDropdownMenu | ✅ None |
| Badge | UBadge | ✅ None |
| Progress | UProgress | ✅ None |
| ScrollArea | (CSS overflow) | ✅ None |
| Checkbox | UCheckbox | ✅ None |
| Calendar | UCalendar | ✅ None |
| Toast | UToast | ✅ Using Nuxt UI useToast |
| Tooltip | UTooltip | ✅ None |
| Avatar | UAvatar | ✅ None |
| Tabs | UTabs | ✅ None |
| Switch | USwitch | ✅ None |
| Slider | USlider | ✅ None |
| Skeleton | USkeleton | ✅ None |
| Separator | USeparator | ✅ None |
| Accordion | UAccordion | ✅ None |
| Alert | UAlert | ✅ None |
| Card | UCard | ✅ None |
| Table | UTable | ✅ None |
| Form | UForm | ✅ None |
| Label | ULabel | ✅ None |

---

### 4.4 Theme Provider

**Source:** `components/theme-provider.tsx`  
**Status:** Not needed - Nuxt UI has built-in dark mode

The original uses `next-themes`:
```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes'
```

Nuxt UI handles this automatically with `@nuxtjs/color-mode`.

---

## 5. Detailed Implementation Tasks

### Task 1: Create `useIsMobile` Composable

**File:** `app/composables/useIsMobile.ts`  
**Priority:** 🔴 High  
**Estimated Time:** 30 minutes

#### Implementation

```ts
// app/composables/useIsMobile.ts
import { useMediaQuery } from '@vueuse/core'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  return isMobile
}
```

**Alternative (without vueuse):**

```ts
// app/composables/useIsMobile.ts
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const isMobile = ref(false)

  onMounted(() => {
    const checkMobile = () => {
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile)
    })
  })

  return isMobile
}
```

#### Integration Points

| Component | Usage |
|-----------|-------|
| `AppShell.vue` | **Pending wiring**: control sidebar display mode |
| `ChatHeader.vue` | **Pending wiring**: mobile-specific header actions |
| `Sidebar.vue` | **Pending wiring**: mobile drawer behavior |

---

### Task 2: Integrate Nuxt UI `useToast` in Feature Flows

**File(s):** `app/components/task/TaskFormDrawer.vue`, `app/components/task/TaskDetailDrawer.vue`, `app/components/chat/InputBar.vue`, `app/components/notifications/NotificationPanel.vue`  
**Priority:** 🔴 High  
**Estimated Time:** 1-2 hours

#### Implementation

```ts
// Use Nuxt UI built-in toast API in feature handlers.
const toast = useToast()

toast.add({
  title: 'Task Created',
  description: 'Your task has been created successfully',
  color: 'success',
  icon: 'i-lucide-check-circle'
})
```

#### Toast Container Component

**File:** `app/components/ToastContainer.vue`

```vue
<script setup lang="ts">
const { toasts, remove } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
        >
          <button @click="remove(toast.id)">Dismiss</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
```

#### Integration Points

| Component | Usage |
|-----------|-------|
| `TaskFormDrawer.vue` | Task creation success/error |
| `TaskDetailDrawer.vue` | Task update/delete feedback |
| `InputBar.vue` | Message send confirmation |
| `NotificationPanel.vue` | Notification actions |

---

### Task 3: Add Custom Fonts

**Priority:** 🟡 Medium  
**Estimated Time:** 30 minutes

#### Option A: Use @fontsource (Recommended)

```bash
pnpm add @fontsource-variable/geist @fontsource-variable/geist-mono
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/geist-mono";

@theme static {
  --font-sans: 'Geist Variable', 'Geist', sans-serif;
  --font-mono: 'Geist Mono Variable', 'Geist Mono', monospace;
}
```

#### Option B: Use Google Fonts

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap'
        }
      ]
    }
  }
})
```

---

### Task 4: Update Viewport Configuration

**File:** `app/app.vue`  
**Priority:** 🟡 Medium  
**Estimated Time:** 15 minutes

```vue
<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'theme-color', content: '#121519' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'TaskChat'
const description = 'A task management app with real-time chat and collaboration features'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <AppShell />
    <ToastContainer />
  </UApp>
</template>
```

---

### Task 5: Complete CSS Variables

**File:** `app/assets/css/main.css`  
**Priority:** 🟡 Medium  
**Estimated Time:** 1 hour

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@fontsource-variable/geist";

@theme static {
  --font-sans: 'Geist Variable', sans-serif;
  --font-mono: 'Geist Mono Variable', monospace;
  
  /* Custom color palette */
  --color-green-50: #EFFDF5;
  --color-green-100: #D9FBE8;
  --color-green-200: #B3F5D1;
  --color-green-300: #75EDAE;
  --color-green-400: #00DC82;
  --color-green-500: #00C16A;
  --color-green-600: #00A155;
  --color-green-700: #007F45;
  --color-green-800: #016538;
  --color-green-900: #0A5331;
  --color-green-950: #052E16;
}

:root {
  /* Semantic colors - Light mode */
  --background: 0 0% 100%;
  --foreground: 210 20% 10%;
  --card: 0 0% 100%;
  --card-foreground: 210 20% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 20% 10%;
  --primary: 210 100% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 10% 95%;
  --secondary-foreground: 210 20% 20%;
  --muted: 210 10% 95%;
  --muted-foreground: 210 10% 45%;
  --accent: 210 10% 95%;
  --accent-foreground: 210 20% 20%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 10% 90%;
  --input: 210 10% 90%;
  --ring: 210 100% 52%;
  --radius: 0.75rem;

  /* Status colors */
  --status-todo: 215 16% 47%;
  --status-in-progress: 199 89% 48%;
  --status-review: 280 65% 60%;
  --status-done: 142 71% 45%;
  --status-blocked: 0 72% 51%;

  /* Priority colors */
  --priority-low: 215 16% 47%;
  --priority-medium: 45 93% 47%;
  --priority-high: 25 95% 53%;
  --priority-urgent: 0 72% 51%;

  /* Chat bubble colors */
  --bubble-own: 210 100% 52%;
  --bubble-own-foreground: 0 0% 100%;
  --bubble-other: 210 10% 95%;
  --bubble-other-foreground: 210 20% 20%;

  /* Sidebar colors */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 210 20% 20%;
  --sidebar-primary: 210 100% 52%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 210 10% 95%;
  --sidebar-accent-foreground: 210 20% 20%;
  --sidebar-border: 210 10% 90%;
  --sidebar-ring: 210 100% 52%;

  /* Chart colors */
  --chart-1: 210 100% 52%;
  --chart-2: 142 71% 45%;
  --chart-3: 38 92% 50%;
  --chart-4: 262 83% 58%;
  --chart-5: 340 82% 52%;
}

.dark {
  /* Semantic colors - Dark mode */
  --background: 210 15% 8%;
  --foreground: 210 20% 95%;
  --card: 210 12% 12%;
  --card-foreground: 210 20% 95%;
  --popover: 210 12% 14%;
  --popover-foreground: 210 20% 95%;
  --primary: 210 100% 52%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 10% 18%;
  --secondary-foreground: 210 20% 90%;
  --muted: 210 10% 16%;
  --muted-foreground: 210 12% 55%;
  --accent: 210 10% 20%;
  --accent-foreground: 210 20% 95%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 10% 16%;
  --input: 210 10% 18%;
  --ring: 210 100% 52%;

  /* Status colors - Dark mode */
  --status-todo: 215 20% 55%;
  --status-in-progress: 199 89% 58%;
  --status-review: 280 65% 70%;
  --status-done: 142 71% 50%;
  --status-blocked: 0 72% 58%;

  /* Priority colors - Dark mode */
  --priority-low: 215 20% 55%;
  --priority-medium: 45 93% 57%;
  --priority-high: 25 95% 58%;
  --priority-urgent: 0 72% 58%;

  /* Chat bubble colors - Dark mode */
  --bubble-own: 210 100% 52%;
  --bubble-own-foreground: 0 0% 100%;
  --bubble-other: 210 10% 18%;
  --bubble-other-foreground: 210 20% 90%;

  /* Sidebar colors - Dark mode */
  --sidebar-background: 210 14% 10%;
  --sidebar-foreground: 210 20% 90%;
  --sidebar-primary: 210 100% 52%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 210 10% 14%;
  --sidebar-accent-foreground: 210 20% 90%;
  --sidebar-border: 210 10% 14%;
  --sidebar-ring: 210 100% 52%;
}

html, body, #__nuxt, #__layout {
  height: 100%;
}

/* Base styles */
* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Utility classes */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: hsl(210 10% 20%) transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: hsl(210 10% 20%);
    border-radius: 9999px;
  }

  .text-balance {
    text-wrap: balance;
  }
}
```

---

### Task 6: Write Tests

**Priority:** 🟢 Low  
**Estimated Time:** 4-8 hours

#### Unit Tests for Store

**File:** `test/unit/store.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '~/composables/useAppStore'

describe('useAppStore', () => {
  let store: ReturnType<typeof useAppStore>

  beforeEach(() => {
    // Reset store state
    store = useAppStore()
    store.dispatch({ type: 'RESET_STATE' })
  })

  describe('SET_ACTIVE_THREAD', () => {
    it('should set active thread', () => {
      store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
      expect(store.state.value.activeThreadId).toBe('t1')
    })

    it('should clear active task when setting thread', () => {
      store.dispatch({ type: 'SET_ACTIVE_TASK', taskId: 'task1' })
      store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
      expect(store.state.value.activeTaskId).toBeNull()
    })

    it('should clear unread count for selected thread', () => {
      const thread = store.state.value.threads.find(t => t.id === 't1')
      expect(thread?.unreadCount).toBeGreaterThan(0)
      
      store.dispatch({ type: 'SET_ACTIVE_THREAD', threadId: 't1' })
      
      const updatedThread = store.state.value.threads.find(t => t.id === 't1')
      expect(updatedThread?.unreadCount).toBe(0)
    })
  })

  describe('ADD_TASK', () => {
    it('should add task and create message', () => {
      const initialTaskCount = store.state.value.tasks.length
      const initialMessageCount = store.state.value.messages.length
      
      store.dispatch({
        type: 'ADD_TASK',
        task: {
          id: 'new-task',
          threadId: 't1',
          title: 'Test Task',
          status: 'todo',
          priority: 'medium',
          assignees: [],
          createdBy: 'u1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          dependencies: []
        },
        message: {
          id: 'new-msg',
          threadId: 't1',
          type: 'task-created',
          content: 'Created task: Test Task',
          senderId: 'u1',
          taskId: 'new-task',
          timestamp: new Date().toISOString()
        }
      })
      
      expect(store.state.value.tasks.length).toBe(initialTaskCount + 1)
      expect(store.state.value.messages.length).toBe(initialMessageCount + 1)
    })
  })

  describe('DELETE_TASK', () => {
    it('should delete task and its subtasks', () => {
      // task4 is a subtask of task3
      const task3Exists = store.state.value.tasks.some(t => t.id === 'task3')
      const task4Exists = store.state.value.tasks.some(t => t.id === 'task4')
      
      expect(task3Exists).toBe(true)
      expect(task4Exists).toBe(true)
      
      store.dispatch({ type: 'DELETE_TASK', taskId: 'task3' })
      
      const task3Deleted = !store.state.value.tasks.some(t => t.id === 'task3')
      const task4Deleted = !store.state.value.tasks.some(t => t.id === 'task4')
      
      expect(task3Deleted).toBe(true)
      expect(task4Deleted).toBe(true) // Subtask should also be deleted
    })
  })
})
```

#### Component Tests

**File:** `test/nuxt/Sidebar.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Sidebar from '~/components/sidebar/Sidebar.vue'

describe('Sidebar', () => {
  it('should render thread list', async () => {
    const wrapper = await mountSuspended(Sidebar)
    
    expect(wrapper.find('[data-testid="thread-list"]').exists()).toBe(true)
  })

  it('should filter threads by search query', async () => {
    const wrapper = await mountSuspended(Sidebar)
    const store = useAppStore()
    
    store.dispatch({ type: 'SET_SEARCH', query: 'Website' })
    await nextTick()
    
    const threads = wrapper.findAllComponents({ name: 'SidebarThreadItem' })
    expect(threads.length).toBe(1)
  })
})
```

#### E2E Tests

**File:** `test/e2e/example.test.ts` (placeholder; replace with `test/e2e/taskflow.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Task Flow E2E', async () => {
  await setup()

  it('should display welcome message when no thread selected', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Welcome to TaskChat')
  })

  it('should switch threads', async () => {
    // Navigate to app
    // Click on thread
    // Verify chat view appears
  })

  it('should create a new task', async () => {
    // Select thread
    // Open task form
    // Fill in task details
    // Submit
    // Verify task appears in list
  })
})
```

---

## 6. Testing Checklist

### Unit Tests

- [x] `useAppStore` smoke coverage (`SET_ACTIVE_THREAD`, `ADD_TASK`, `DELETE_TASK`)
- [x] `useIsMobile` composable basic type/ref check
- [ ] `useAppStore` full action matrix (remaining 15+ actions)
- [ ] `useAppStore` computed selectors and factory function tests
- [ ] Utility function tests (`relativeTime`, `formatTime`, `formatDate`, `isDueOverdue`, `isDueSoon`, `generateId`)
- [ ] localStorage persistence tests (load + save + malformed state fallback)

### Component Tests

- [x] `Sidebar` mount smoke test
- [x] `TaskFormDrawer` mount smoke test
- [ ] `AppShell` behavior tests (thread-empty state, sidebar toggle)
- [ ] `Sidebar` behavior tests (filtering, new thread creation)
- [ ] `InputBar` behavior tests (slash commands, message send)
- [ ] `TaskFormDrawer` behavior tests (validation + task creation flow)
- [ ] `TaskDetailDrawer` behavior tests (status, subtasks, delete)
- [ ] `NotificationPanel` behavior tests (mark read, mark all read)

### E2E Tests

- [x] Basic page render in `test/e2e/example.test.ts` (starter-style assertion)
- [ ] User can select a thread
- [ ] User can send a message
- [ ] User can create a task via form
- [ ] User can create a task via `/task` command
- [ ] User can use task templates
- [ ] User can update task status
- [ ] User can add subtasks
- [ ] User can delete a task
- [ ] User receives notifications
- [ ] User can mark notifications read
- [ ] Sidebar is responsive (mobile/desktop)
- [ ] State persists across page reload

### Visual Regression Tests

- [ ] Light mode - All pages
- [ ] Dark mode - All pages
- [ ] Mobile viewport - All components
- [ ] Desktop viewport - All components
- [ ] Tablet viewport - All components

---

## 7. Risk Assessment

### High Risk Items (Open)

| Risk | Impact | Status |
|------|--------|--------|
| Toast actions not integrated in feature flows | Missing user feedback for success/error states | ⚠️ Open |
| Test coverage overstated in previous report | Regressions can ship unnoticed | ⚠️ Open |
| Starter artifacts still present in production branch | Confusing UX/docs and migration ambiguity | ⚠️ Open |

### Medium Risk Items (Mixed)

| Risk | Impact | Status |
|------|--------|--------|
| `useIsMobile` not wired in UI | Dead code / inconsistent responsive strategy | ⚠️ Open |
| Routing mismatch (`app.vue` bypasses pages) | Future routing changes become error-prone | ⚠️ Open |
| State persistence edge cases not tested | Potential data load/save regressions | ⚠️ Open |

### Low Risk Items (Resolved)

| Risk | Impact | Status |
|------|--------|--------|
| Missing fonts | Inconsistent branding | ✅ Added Geist fonts |
| CSS variable mismatch | Color inconsistencies | ✅ Complete CSS migration |
| Viewport config | Minor mobile issues | ✅ Updated meta tags |

---

## Appendix: File Mapping Reference

### Complete File Mapping

| Source (task-management-app) | Target (ClientV2) | Status |
|------------------------------|-------------------|--------|
| `app/layout.tsx` | `app/app.vue` | ✅ |
| `app/page.tsx` | `app/pages/index.vue` | ⚠️ Present but currently starter content and not used by `app/app.vue` |
| `app/globals.css` | `app/assets/css/main.css` | ✅ Complete |
| `lib/store.tsx` | `app/composables/useAppStore.ts` | ✅ |
| `lib/types.ts` | `app/types/index.ts` | ✅ |
| `lib/utils.ts` | `app/utils/index.ts` | ✅ |
| `lib/seed-data.ts` | `app/data/seed.ts` | ✅ |
| `hooks/use-mobile.tsx` | `app/composables/useIsMobile.ts` | ⚠️ Implemented, integration pending |
| `hooks/use-toast.ts` | Nuxt UI built-in `useToast` | ⚠️ API available, feature usage pending |
| `components/app-shell.tsx` | `app/components/AppShell.vue` | ✅ |
| `components/theme-provider.tsx` | Nuxt UI built-in | ✅ N/A |
| `components/sidebar/sidebar.tsx` | `app/components/sidebar/Sidebar.vue` | ✅ |
| `components/sidebar/sidebar-header.tsx` | `app/components/sidebar/SidebarHeader.vue` | ✅ |
| `components/sidebar/thread-item.tsx` | `app/components/sidebar/ThreadItem.vue` | ✅ |
| `components/chat/chat-view.tsx` | `app/components/chat/ChatView.vue` | ✅ |
| `components/chat/chat-header.tsx` | `app/components/chat/ChatHeader.vue` | ✅ |
| `components/chat/input-bar.tsx` | `app/components/chat/InputBar.vue` | ✅ |
| `components/chat/message-bubble.tsx` | `app/components/chat/MessageBubble.vue` | ✅ |
| `components/chat/system-bubble.tsx` | `app/components/chat/SystemBubble.vue` | ✅ |
| `components/chat/task-card-bubble.tsx` | `app/components/chat/TaskCardBubble.vue` | ✅ |
| `components/task/task-form-drawer.tsx` | `app/components/task/TaskFormDrawer.vue` | ✅ |
| `components/task/task-detail-drawer.tsx` | `app/components/task/TaskDetailDrawer.vue` | ✅ |
| `components/task/task-template-picker.tsx` | `app/components/task/TaskTemplatePicker.vue` | ✅ |
| `components/shared/user-avatar.tsx` | `app/components/shared/UserAvatar.vue` | ✅ |
| `components/shared/status-badge.tsx` | `app/components/shared/StatusBadge.vue` | ✅ |
| `components/shared/priority-badge.tsx` | `app/components/shared/PriorityBadge.vue` | ✅ |
| - | `app/components/shared/AvatarStack.vue` | ✅ Enhanced |
| `components/notifications/notification-panel.tsx` | `app/components/notifications/NotificationPanel.vue` | ✅ |
| - | `app/components/ToastContainer.vue` | ✅ New |
| - | `app/components/TemplateMenu.vue` | ⚠️ Starter artifact (cleanup pending) |
| - | `app/components/AppLogo.vue` | ⚠️ Starter artifact (cleanup pending) |
| `README.md` | `README.md` | ⚠️ Still Nuxt starter text; migration docs pending |
| `components/ui/*` (45 files) | Nuxt UI components | ✅ N/A |
| `tailwind.config.ts` | Nuxt UI config | ⚠️ Different approach |
| `package.json` | `package.json` | ✅ Different deps |

### Dependency Mapping

| React Dependency | Vue Equivalent |
|------------------|----------------|
| `react` | `vue` |
| `react-dom` | `vue` |
| `next` | `nuxt` |
| `next-themes` | `@nuxtjs/color-mode` (built into Nuxt UI) |
| `lucide-react` | `@nuxt/icon` with lucide icons |
| `@radix-ui/*` | `@nuxt/ui` (headless UI) |
| `clsx` + `tailwind-merge` | `twJoin` (custom) |
| `tailwindcss-animate` | Nuxt UI transitions |

### New Dependencies Added

| Package | Purpose |
|---------|---------|
| `@vueuse/core` | Composables (useMediaQuery for useIsMobile) |
| `@fontsource-variable/geist` | Geist font |
| `@fontsource-variable/geist-mono` | Geist Mono font |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Feb 2026 | 1.0 | Initial migration plan created |
| Feb 2026 | 2.0 | Migration completed - added useIsMobile, ToastContainer, Geist fonts, CSS variables, viewport config, test placeholders |
| Feb 2026 | 2.1 | Verification pass: corrected completion status, added forgotten items, updated risks/tests/next actions |

---

## Next Steps

1. **Immediate (Next 2-3 Days)**
   - [ ] Decide routing strategy: keep `app/app.vue` shell-only or switch to `<NuxtPage />` architecture
   - [ ] Remove/replace starter artifacts (`app/pages/index.vue`, `README.md`, `TemplateMenu.vue`, `AppLogo.vue`)
   - [ ] Wire toast calls into task/message/notification flows
   - [ ] Wire `useIsMobile` into UI behavior or remove dependency if CSS-only approach is intentional

2. **Short-term (This Sprint)**
   - [ ] Replace smoke tests with behavior-driven unit/component tests
   - [ ] Replace `test/e2e/example.test.ts` with real task workflow scenarios
   - [ ] Add persistence edge-case tests for localStorage

3. **Hardening (Next Sprint)**
   - [ ] Visual regression testing
   - [ ] Performance optimization
   - [ ] Accessibility audit
