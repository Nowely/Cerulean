import type { Block } from '../types/block'
import type { ThreadData, MessageData } from '../types/thread'
import type { TaskData } from '../types/task'
import type { NoteData } from '../types/note'
import type { ContactData } from '../types/contact'
import type { ShoppingItemData } from '../types/shopping'
import type { User } from '../types/user'

const now = Date.now()

export const SEED_USERS: User[] = [
  { id: 'u1', name: 'You', initials: 'YO', color: 'hsl(210 100% 52%)' },
  { id: 'u2', name: 'Sarah Chen', initials: 'SC', color: 'hsl(340 82% 52%)' },
  { id: 'u3', name: 'Alex Rivera', initials: 'AR', color: 'hsl(142 71% 45%)' },
  { id: 'u4', name: 'Jordan Lee', initials: 'JL', color: 'hsl(38 92% 50%)' },
  { id: 'u5', name: 'Morgan Park', initials: 'MP', color: 'hsl(262 83% 58%)' }
]

const threadBlocks: Block<ThreadData>[] = [
  {
    id: 't1',
    name: 'Website Redesign',
    created: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    updated: new Date(now - 1000 * 60 * 5).toISOString(),
    props: {},
    data: {
      kind: 'tasks',
      members: ['u1', 'u2', 'u3'],
      lastActivity: new Date(now - 1000 * 60 * 5).toISOString(),
      unreadCount: 3,
      pinned: false,
      category: 'Design'
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['task1', 'task2', 'task3', 'task4', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11']
  },
  {
    id: 't2',
    name: 'Mobile App Sprint',
    created: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
    updated: new Date(now - 1000 * 60 * 30).toISOString(),
    props: {},
    data: {
      kind: 'tasks',
      members: ['u1', 'u3', 'u4'],
      lastActivity: new Date(now - 1000 * 60 * 30).toISOString(),
      unreadCount: 1,
      pinned: false,
      category: 'Engineering'
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['task5', 'task6', 'task7', 'm20', 'm21', 'm22', 'm23', 'm24', 'm25', 'm26']
  },
  {
    id: 't3',
    name: 'Marketing Launch',
    created: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    props: {},
    data: {
      kind: 'chat',
      members: ['u1', 'u2', 'u5'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      unreadCount: 0,
      pinned: false,
      category: 'Marketing'
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['task8', 'm30', 'm31', 'm32', 'm33']
  },
  {
    id: 't4',
    name: 'Sarah Chen',
    created: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    props: {},
    data: {
      kind: 'chat',
      members: ['u1', 'u2'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      unreadCount: 0,
      pinned: false
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['m40', 'm41', 'm42']
  },
  {
    id: 't5',
    name: 'Bug Triage',
    created: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    props: {},
    data: {
      kind: 'tasks',
      members: ['u1', 'u2', 'u3', 'u4', 'u5'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
      unreadCount: 5,
      pinned: false,
      category: 'Engineering'
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['task9', 'task10', 'm50', 'm51', 'm52', 'm53', 'm54']
  },
  {
    id: 't6',
    name: 'Groceries',
    created: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    props: {},
    data: {
      kind: 'shopping',
      members: ['u1'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      unreadCount: 0,
      pinned: true
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['si1', 'si2', 'si3', 'si4', 'si5', 'si6', 'si7', 'si8']
  },
  {
    id: 't7',
    name: 'Personal Notes',
    created: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    props: {},
    data: {
      kind: 'notes',
      members: ['u1'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
      unreadCount: 0,
      pinned: false
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['n-1', 'n-2', 'n-3', 'n-4']
  },
  {
    id: 't8',
    name: 'Team Contacts',
    created: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    props: {},
    data: {
      kind: 'contacts',
      members: ['u1'],
      lastActivity: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      unreadCount: 0,
      pinned: false
    },
    meta: { type: 'thread' },
    parents: [],
    children: ['c1', 'c2', 'c3', 'c4', 'c5']
  }
]

const taskBlocks: Block<TaskData>[] = [
  {
    id: 'task1',
    name: 'Design new homepage hero section',
    created: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    updated: new Date(now - 1000 * 60 * 30).toISOString(),
    props: {},
    data: {
      description: 'Create a modern, responsive hero section with animated elements and clear CTA. Should align with the new brand guidelines.',
      status: 'in-progress',
      priority: 'high',
      assignees: ['u1', 'u2'],
      createdBy: 'u2',
      dueDate: new Date(now + 1000 * 60 * 60 * 24 * 3).toISOString(),
      tags: ['design', 'homepage'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t1'],
    children: []
  },
  {
    id: 'task2',
    name: 'Set up design system tokens',
    created: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    props: {},
    data: {
      description: 'Define color palette, typography scale, and spacing tokens in Figma and code.',
      status: 'done',
      priority: 'high',
      assignees: ['u2'],
      createdBy: 'u1',
      tags: ['design', 'tokens'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t1'],
    children: []
  },
  {
    id: 'task3',
    name: 'Implement responsive navigation',
    created: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    props: {},
    data: {
      description: 'Build mobile-first responsive navigation with hamburger menu for mobile and horizontal nav for desktop.',
      status: 'todo',
      priority: 'medium',
      assignees: ['u3'],
      createdBy: 'u1',
      dueDate: new Date(now + 1000 * 60 * 60 * 24 * 5).toISOString(),
      tags: ['frontend', 'navigation'],
      dependencies: ['task2'],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t1'],
    children: ['task4']
  },
  {
    id: 'task4',
    name: 'Create footer component',
    created: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    props: {},
    data: {
      status: 'todo',
      priority: 'low',
      assignees: ['u3'],
      createdBy: 'u2',
      tags: ['frontend'],
      dependencies: ['task2'],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t1', 'task3'],
    children: []
  },
  {
    id: 'task5',
    name: 'Set up React Native project',
    created: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    props: {},
    data: {
      description: 'Initialize the project with Expo, configure TypeScript, and set up navigation.',
      status: 'done',
      priority: 'urgent',
      assignees: ['u3'],
      createdBy: 'u1',
      tags: ['setup', 'mobile'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t2'],
    children: []
  },
  {
    id: 'task6',
    name: 'Build authentication flow',
    created: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    props: {},
    data: {
      description: 'Implement login, signup, and password reset screens with form validation.',
      status: 'in-progress',
      priority: 'high',
      assignees: ['u1', 'u4'],
      createdBy: 'u3',
      dueDate: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
      tags: ['auth', 'mobile'],
      dependencies: ['task5'],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t2'],
    children: []
  },
  {
    id: 'task7',
    name: 'Design app icon and splash screen',
    created: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    props: {},
    data: {
      status: 'review',
      priority: 'medium',
      assignees: ['u4'],
      createdBy: 'u4',
      tags: ['design', 'branding'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t2'],
    children: []
  },
  {
    id: 'task8',
    name: 'Write blog launch announcement',
    created: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    props: {},
    data: {
      description: 'Draft and review the product launch blog post. Include screenshots, feature highlights, and pricing.',
      status: 'todo',
      priority: 'high',
      assignees: ['u5'],
      createdBy: 'u1',
      dueDate: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
      tags: ['content', 'launch'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t3'],
    children: []
  },
  {
    id: 'task9',
    name: 'Fix login redirect loop on Safari',
    created: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    props: {},
    data: {
      description: 'Users on Safari are experiencing infinite redirect loops after authentication.',
      status: 'blocked',
      priority: 'urgent',
      assignees: ['u1', 'u3'],
      createdBy: 'u4',
      tags: ['bug', 'auth', 'safari'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t5'],
    children: []
  },
  {
    id: 'task10',
    name: 'Memory leak in dashboard charts',
    created: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    updated: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    props: {},
    data: {
      status: 'in-progress',
      priority: 'high',
      assignees: ['u3'],
      createdBy: 'u2',
      tags: ['bug', 'performance'],
      dependencies: [],
      templateId: undefined
    },
    meta: { type: 'task' },
    parents: ['t5'],
    children: []
  }
]

const messageBlocks: Block<MessageData>[] = [
  { id: 'm1', name: '', created: new Date(now - 1000 * 60 * 60 * 72).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 72).toISOString(), props: {}, data: { type: 'system', content: 'Sarah Chen created this project', senderId: 'u2' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm2', name: '', created: new Date(now - 1000 * 60 * 60 * 72).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 72).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Set up design system tokens', senderId: 'u1', taskId: 'task2' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm3', name: '', created: new Date(now - 1000 * 60 * 60 * 60).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 60).toISOString(), props: {}, data: { type: 'text', content: 'I\'ve started working on the design tokens. Should we use the existing brand colors or go with something fresh?', senderId: 'u2' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm4', name: '', created: new Date(now - 1000 * 60 * 60 * 59).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 59).toISOString(), props: {}, data: { type: 'text', content: 'Let\'s keep the primary blue but update the secondary palette. I\'ll share some references.', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm5', name: '', created: new Date(now - 1000 * 60 * 60 * 12).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 12).toISOString(), props: {}, data: { type: 'status-change', content: 'marked Set up design system tokens as done', senderId: 'u2', taskId: 'task2', metadata: { from: 'in-progress', to: 'done' } }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm6', name: '', created: new Date(now - 1000 * 60 * 60 * 48).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Design new homepage hero section', senderId: 'u2', taskId: 'task1' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm7', name: '', created: new Date(now - 1000 * 60 * 60 * 48).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(), props: {}, data: { type: 'assignment', content: 'assigned you to Design new homepage hero section', senderId: 'u2', taskId: 'task1' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm8', name: '', created: new Date(now - 1000 * 60 * 60 * 6).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 6).toISOString(), props: {}, data: { type: 'text', content: 'The hero section is looking great so far. Can we add a subtle gradient to the background?', senderId: 'u1', taskId: 'task1' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm9', name: '', created: new Date(now - 1000 * 60 * 60 * 24).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Implement responsive navigation', senderId: 'u1', taskId: 'task3' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm10', name: '', created: new Date(now - 1000 * 60 * 60 * 20).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 20).toISOString(), props: {}, data: { type: 'text', content: 'Navigation is blocked until the design tokens are finalized. I\'ll start once that\'s done.', senderId: 'u3' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm11', name: '', created: new Date(now - 1000 * 60 * 5).toISOString(), updated: new Date(now - 1000 * 60 * 5).toISOString(), props: {}, data: { type: 'text', content: 'Tokens are done now -- go ahead and start on the nav!', senderId: 'u2' }, meta: { type: 'message' }, parents: ['t1'], children: [] },
  { id: 'm20', name: '', created: new Date(now - 1000 * 60 * 60 * 96).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 96).toISOString(), props: {}, data: { type: 'system', content: 'You created this project', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm21', name: '', created: new Date(now - 1000 * 60 * 60 * 96).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 96).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Set up React Native project', senderId: 'u1', taskId: 'task5' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm22', name: '', created: new Date(now - 1000 * 60 * 60 * 48).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(), props: {}, data: { type: 'status-change', content: 'marked Set up React Native project as done', senderId: 'u3', taskId: 'task5', metadata: { from: 'in-progress', to: 'done' } }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm23', name: '', created: new Date(now - 1000 * 60 * 60 * 36).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 36).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Build authentication flow', senderId: 'u3', taskId: 'task6' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm24', name: '', created: new Date(now - 1000 * 60 * 60 * 2).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(), props: {}, data: { type: 'text', content: 'Auth flow is coming along. I\'m using the new secure token approach. Should be ready for review by tomorrow.', senderId: 'u4' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm25', name: '', created: new Date(now - 1000 * 60 * 60 * 24).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Design app icon and splash screen', senderId: 'u4', taskId: 'task7' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm26', name: '', created: new Date(now - 1000 * 60 * 30).toISOString(), updated: new Date(now - 1000 * 60 * 30).toISOString(), props: {}, data: { type: 'text', content: 'Icon and splash screen are ready for review. I went with a minimal approach.', senderId: 'u4' }, meta: { type: 'message' }, parents: ['t2'], children: [] },
  { id: 'm30', name: '', created: new Date(now - 1000 * 60 * 60 * 24).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24).toISOString(), props: {}, data: { type: 'system', content: 'You created this group', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t3'], children: [] },
  { id: 'm31', name: '', created: new Date(now - 1000 * 60 * 60 * 8).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 8).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Write blog launch announcement', senderId: 'u1', taskId: 'task8' }, meta: { type: 'message' }, parents: ['t3'], children: [] },
  { id: 'm32', name: '', created: new Date(now - 1000 * 60 * 60 * 6).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 6).toISOString(), props: {}, data: { type: 'text', content: 'I\'ll start the draft today. Any key features you want highlighted?', senderId: 'u5' }, meta: { type: 'message' }, parents: ['t3'], children: [] },
  { id: 'm33', name: '', created: new Date(now - 1000 * 60 * 60 * 5).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 5).toISOString(), props: {}, data: { type: 'text', content: 'Focus on the real-time collaboration and the mobile-first approach. Those are our key differentiators.', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t3'], children: [] },
  { id: 'm40', name: '', created: new Date(now - 1000 * 60 * 60 * 8).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 8).toISOString(), props: {}, data: { type: 'text', content: 'Hey, do you have the brand guidelines PDF?', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t4'], children: [] },
  { id: 'm41', name: '', created: new Date(now - 1000 * 60 * 60 * 7).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 7).toISOString(), props: {}, data: { type: 'text', content: 'Yes! I\'ll share it in the Website Redesign thread. Give me 5 minutes.', senderId: 'u2' }, meta: { type: 'message' }, parents: ['t4'], children: [] },
  { id: 'm42', name: '', created: new Date(now - 1000 * 60 * 60 * 7).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 7).toISOString(), props: {}, data: { type: 'text', content: 'Perfect, thanks!', senderId: 'u1' }, meta: { type: 'message' }, parents: ['t4'], children: [] },
  { id: 'm50', name: '', created: new Date(now - 1000 * 60 * 60 * 48).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(), props: {}, data: { type: 'system', content: 'Jordan Lee created this project', senderId: 'u4' }, meta: { type: 'message' }, parents: ['t5'], children: [] },
  { id: 'm51', name: '', created: new Date(now - 1000 * 60 * 60 * 4).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 4).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Fix login redirect loop on Safari', senderId: 'u4', taskId: 'task9' }, meta: { type: 'message' }, parents: ['t5'], children: [] },
  { id: 'm52', name: '', created: new Date(now - 1000 * 60 * 60 * 4).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 4).toISOString(), props: {}, data: { type: 'text', content: 'This is a P0 -- multiple users are reporting this on Safari 17.3+. Blocking the auth team.', senderId: 'u4' }, meta: { type: 'message' }, parents: ['t5'], children: [] },
  { id: 'm53', name: '', created: new Date(now - 1000 * 60 * 60 * 12).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 12).toISOString(), props: {}, data: { type: 'task-created', content: 'Created task: Memory leak in dashboard charts', senderId: 'u2', taskId: 'task10' }, meta: { type: 'message' }, parents: ['t5'], children: [] },
  { id: 'm54', name: '', created: new Date(now - 1000 * 60 * 60 * 6).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 6).toISOString(), props: {}, data: { type: 'text', content: 'I\'ve narrowed down the memory leak. It\'s the real-time chart subscriptions not being cleaned up properly.', senderId: 'u3' }, meta: { type: 'message' }, parents: ['t5'], children: [] }
]

const noteBlocks: Block<NoteData>[] = [
  { id: 'n-1', name: 'Sprint Planning Notes', created: new Date(now - 1000 * 60 * 60 * 24).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(), props: {}, data: { content: 'Focus areas for next sprint:\n- Authentication improvements\n- Dashboard performance\n- Mobile responsive fixes\n\nCapacity: 40 story points', pinned: true, tags: ['work', 'sprint'] }, meta: { type: 'note' }, parents: ['t7'], children: [] },
  { id: 'n-2', name: 'Design System Colors', created: new Date(now - 1000 * 60 * 60 * 48).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 48).toISOString(), props: {}, data: { content: 'Primary: #00DC82 (green)\nSecondary: slate palette\nAccent: blue-500\n\nDark mode uses HSL shifts for all semantic tokens.', color: 'hsl(262 83% 58%)', pinned: false, tags: ['design', 'reference'] }, meta: { type: 'note' }, parents: ['t7'], children: [] },
  { id: 'n-3', name: 'Meeting with Product', created: new Date(now - 1000 * 60 * 60 * 72).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 72).toISOString(), props: {}, data: { content: 'Key takeaways:\n1. Launch date moved to March 15\n2. Need to prioritize mobile experience\n3. A/B test the onboarding flow\n4. Budget approved for new infrastructure', pinned: false, tags: ['meeting', 'product'] }, meta: { type: 'note' }, parents: ['t7'], children: [] },
  { id: 'n-4', name: 'Book Recommendations', created: new Date(now - 1000 * 60 * 60 * 96).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 96).toISOString(), props: {}, data: { content: '- Designing Data-Intensive Applications\n- The Pragmatic Programmer\n- Refactoring UI\n- Staff Engineer by Will Larson', pinned: false, tags: ['personal', 'reading'] }, meta: { type: 'note' }, parents: ['t7'], children: [] }
]

const contactBlocks: Block<ContactData>[] = [
  { id: 'c1', name: 'Sarah Chen', created: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), props: {}, data: { email: 'sarah.chen@example.com', phone: '+1 (555) 123-4567', company: 'Cerulean Inc.', notes: 'Lead designer, prefers async communication', tags: ['team', 'design'] }, meta: { type: 'contact' }, parents: ['t8'], children: [] },
  { id: 'c2', name: 'Alex Rivera', created: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), props: {}, data: { email: 'alex.r@example.com', phone: '+1 (555) 234-5678', company: 'Cerulean Inc.', notes: 'Full-stack developer, timezone UTC-5', tags: ['team', 'engineering'] }, meta: { type: 'contact' }, parents: ['t8'], children: [] },
  { id: 'c3', name: 'Jordan Lee', created: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(), props: {}, data: { email: 'jordan.lee@example.com', company: 'Cerulean Inc.', tags: ['team', 'engineering'] }, meta: { type: 'contact' }, parents: ['t8'], children: [] },
  { id: 'c4', name: 'Morgan Park', created: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(), props: {}, data: { email: 'morgan.p@example.com', phone: '+1 (555) 456-7890', company: 'Cerulean Inc.', notes: 'Marketing lead', tags: ['team', 'marketing'] }, meta: { type: 'contact' }, parents: ['t8'], children: [] },
  { id: 'c5', name: 'Taylor Kim', created: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), props: {}, data: { email: 'taylor.k@partner.io', phone: '+1 (555) 567-8901', company: 'Partner Agency', notes: 'External contractor for Q1 campaign', tags: ['external', 'marketing'] }, meta: { type: 'contact' }, parents: ['t8'], children: [] }
]

const shoppingBlocks: Block<ShoppingItemData>[] = [
  { id: 'si1', name: 'Milk', created: new Date(now - 1000 * 60 * 60 * 3).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 3).toISOString(), props: {}, data: { type: 'checkable', checked: false, collected: 0, sortOrder: 0 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si2', name: 'Eggs', created: new Date(now - 1000 * 60 * 60 * 3).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 3).toISOString(), props: {}, data: { type: 'checkable', checked: true, collected: 0, sortOrder: 1 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si3', name: 'Bread', created: new Date(now - 1000 * 60 * 60 * 3).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 3).toISOString(), props: {}, data: { type: 'checkable', checked: false, collected: 0, sortOrder: 2 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si4', name: 'Chicken breast', created: new Date(now - 1000 * 60 * 60 * 2).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(), props: {}, data: { type: 'trackable', checked: false, collected: 2, sortOrder: 3 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si5', name: 'Bananas', created: new Date(now - 1000 * 60 * 60 * 2).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(), props: {}, data: { type: 'checkable', checked: true, collected: 0, sortOrder: 4 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si6', name: 'Spinach', created: new Date(now - 1000 * 60 * 60 * 2).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 2).toISOString(), props: {}, data: { type: 'checkable', checked: false, collected: 0, sortOrder: 5 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si7', name: 'Apples', created: new Date(now - 1000 * 60 * 60 * 1).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 1).toISOString(), props: {}, data: { type: 'trackable', checked: false, collected: 0, sortOrder: 6 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] },
  { id: 'si8', name: 'Pasta', created: new Date(now - 1000 * 60 * 60 * 1).toISOString(), updated: new Date(now - 1000 * 60 * 60 * 1).toISOString(), props: {}, data: { type: 'trackable', checked: false, collected: 3, sortOrder: 7 }, meta: { type: 'shopping-item' }, parents: ['t6'], children: [] }
]

export const SEED_TEMPLATES = [
  { id: 'tmpl1', name: 'Bug Report', description: 'Standard bug report with reproduction steps', defaultPriority: 'high' as const, defaultTags: ['bug'], subtasks: [{ title: 'Reproduce the issue' }, { title: 'Identify root cause' }, { title: 'Implement fix' }, { title: 'Write tests' }, { title: 'Deploy fix' }] },
  { id: 'tmpl2', name: 'Feature Request', description: 'New feature with design and implementation phases', defaultPriority: 'medium' as const, defaultTags: ['feature'], subtasks: [{ title: 'Write requirements' }, { title: 'Create design mockups' }, { title: 'Implement feature' }, { title: 'QA testing' }] },
  { id: 'tmpl3', name: 'Sprint Task', description: 'Standard sprint task with full lifecycle', defaultPriority: 'medium' as const, defaultTags: ['sprint'], subtasks: [{ title: 'Design' }, { title: 'Implement' }, { title: 'Test' }, { title: 'Code review' }] },
  { id: 'tmpl4', name: 'Meeting Action Item', description: 'Quick action item from a meeting', defaultPriority: 'medium' as const, defaultTags: ['action-item'], defaultDueOffsetDays: 1, subtasks: [] }
]

export function getSeedBlocks(): Block[] {
  return [
    ...threadBlocks,
    ...taskBlocks,
    ...messageBlocks,
    ...noteBlocks,
    ...contactBlocks,
    ...shoppingBlocks
  ]
}
