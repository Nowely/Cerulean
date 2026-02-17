import type { User, Thread, Task, Message, TaskTemplate, Notification } from '~/types'

export const SEED_USERS: User[] = [
  { id: 'u1', name: 'You', initials: 'YO', color: 'hsl(210 100% 52%)' },
  { id: 'u2', name: 'Sarah Chen', initials: 'SC', color: 'hsl(340 82% 52%)' },
  { id: 'u3', name: 'Alex Rivera', initials: 'AR', color: 'hsl(142 71% 45%)' },
  { id: 'u4', name: 'Jordan Lee', initials: 'JL', color: 'hsl(38 92% 50%)' },
  { id: 'u5', name: 'Morgan Park', initials: 'MP', color: 'hsl(262 83% 58%)' }
]

export const SEED_THREADS: Thread[] = [
  {
    id: 't1',
    name: 'Website Redesign',
    type: 'project',
    members: ['u1', 'u2', 'u3'],
    lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    unreadCount: 3,
    pinned: true,
    category: 'Design'
  },
  {
    id: 't2',
    name: 'Mobile App Sprint',
    type: 'project',
    members: ['u1', 'u3', 'u4'],
    lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    unreadCount: 1,
    pinned: true,
    category: 'Engineering'
  },
  {
    id: 't3',
    name: 'Marketing Launch',
    type: 'group',
    members: ['u1', 'u2', 'u5'],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unreadCount: 0,
    pinned: false,
    category: 'Marketing'
  },
  {
    id: 't4',
    name: 'Sarah Chen',
    type: 'direct',
    members: ['u1', 'u2'],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    unreadCount: 0,
    pinned: false
  },
  {
    id: 't5',
    name: 'Bug Triage',
    type: 'project',
    members: ['u1', 'u2', 'u3', 'u4', 'u5'],
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unreadCount: 5,
    pinned: false,
    category: 'Engineering'
  }
]

const now = Date.now()

export const SEED_TASKS: Task[] = [
  {
    id: 'task1',
    threadId: 't1',
    title: 'Design new homepage hero section',
    description: 'Create a modern, responsive hero section with animated elements and clear CTA. Should align with the new brand guidelines.',
    status: 'in-progress',
    priority: 'high',
    assignees: ['u1', 'u2'],
    createdBy: 'u2',
    createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
    dueDate: new Date(now + 1000 * 60 * 60 * 24 * 3).toISOString(),
    tags: ['design', 'homepage'],
    dependencies: []
  },
  {
    id: 'task2',
    threadId: 't1',
    title: 'Set up design system tokens',
    description: 'Define color palette, typography scale, and spacing tokens in Figma and code.',
    status: 'done',
    priority: 'high',
    assignees: ['u2'],
    createdBy: 'u1',
    createdAt: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    tags: ['design', 'tokens'],
    dependencies: []
  },
  {
    id: 'task3',
    threadId: 't1',
    title: 'Implement responsive navigation',
    description: 'Build mobile-first responsive navigation with hamburger menu for mobile and horizontal nav for desktop.',
    status: 'todo',
    priority: 'medium',
    assignees: ['u3'],
    createdBy: 'u1',
    createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    dueDate: new Date(now + 1000 * 60 * 60 * 24 * 5).toISOString(),
    tags: ['frontend', 'navigation'],
    dependencies: ['task2']
  },
  {
    id: 'task4',
    threadId: 't1',
    title: 'Create footer component',
    status: 'todo',
    priority: 'low',
    assignees: ['u3'],
    createdBy: 'u2',
    createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    tags: ['frontend'],
    dependencies: ['task2'],
    parentTaskId: 'task3'
  },
  {
    id: 'task5',
    threadId: 't2',
    title: 'Set up React Native project',
    description: 'Initialize the project with Expo, configure TypeScript, and set up navigation.',
    status: 'done',
    priority: 'urgent',
    assignees: ['u3'],
    createdBy: 'u1',
    createdAt: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    tags: ['setup', 'mobile'],
    dependencies: []
  },
  {
    id: 'task6',
    threadId: 't2',
    title: 'Build authentication flow',
    description: 'Implement login, signup, and password reset screens with form validation.',
    status: 'in-progress',
    priority: 'high',
    assignees: ['u1', 'u4'],
    createdBy: 'u3',
    createdAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    dueDate: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
    tags: ['auth', 'mobile'],
    dependencies: ['task5']
  },
  {
    id: 'task7',
    threadId: 't2',
    title: 'Design app icon and splash screen',
    status: 'review',
    priority: 'medium',
    assignees: ['u4'],
    createdBy: 'u4',
    createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    tags: ['design', 'branding'],
    dependencies: []
  },
  {
    id: 'task8',
    threadId: 't3',
    title: 'Write blog launch announcement',
    description: 'Draft and review the product launch blog post. Include screenshots, feature highlights, and pricing.',
    status: 'todo',
    priority: 'high',
    assignees: ['u5'],
    createdBy: 'u1',
    createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    dueDate: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
    tags: ['content', 'launch'],
    dependencies: []
  },
  {
    id: 'task9',
    threadId: 't5',
    title: 'Fix login redirect loop on Safari',
    description: 'Users on Safari are experiencing infinite redirect loops after authentication.',
    status: 'blocked',
    priority: 'urgent',
    assignees: ['u1', 'u3'],
    createdBy: 'u4',
    createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    tags: ['bug', 'auth', 'safari'],
    dependencies: []
  },
  {
    id: 'task10',
    threadId: 't5',
    title: 'Memory leak in dashboard charts',
    status: 'in-progress',
    priority: 'high',
    assignees: ['u3'],
    createdBy: 'u2',
    createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    tags: ['bug', 'performance'],
    dependencies: []
  }
]

export const SEED_MESSAGES: Message[] = [
  {
    id: 'm1',
    threadId: 't1',
    type: 'system',
    content: 'Sarah Chen created this project',
    senderId: 'u2',
    timestamp: new Date(now - 1000 * 60 * 60 * 72).toISOString()
  },
  {
    id: 'm2',
    threadId: 't1',
    type: 'task-created',
    content: 'Created task: Set up design system tokens',
    senderId: 'u1',
    taskId: 'task2',
    timestamp: new Date(now - 1000 * 60 * 60 * 72).toISOString()
  },
  {
    id: 'm3',
    threadId: 't1',
    type: 'text',
    content: 'I\'ve started working on the design tokens. Should we use the existing brand colors or go with something fresh?',
    senderId: 'u2',
    timestamp: new Date(now - 1000 * 60 * 60 * 60).toISOString()
  },
  {
    id: 'm4',
    threadId: 't1',
    type: 'text',
    content: 'Let\'s keep the primary blue but update the secondary palette. I\'ll share some references.',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 59).toISOString()
  },
  {
    id: 'm5',
    threadId: 't1',
    type: 'status-change',
    content: 'marked Set up design system tokens as done',
    senderId: 'u2',
    taskId: 'task2',
    timestamp: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    metadata: { from: 'in-progress', to: 'done' }
  },
  {
    id: 'm6',
    threadId: 't1',
    type: 'task-created',
    content: 'Created task: Design new homepage hero section',
    senderId: 'u2',
    taskId: 'task1',
    timestamp: new Date(now - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: 'm7',
    threadId: 't1',
    type: 'assignment',
    content: 'assigned you to Design new homepage hero section',
    senderId: 'u2',
    taskId: 'task1',
    timestamp: new Date(now - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: 'm8',
    threadId: 't1',
    type: 'text',
    content: 'The hero section is looking great so far. Can we add a subtle gradient to the background?',
    senderId: 'u1',
    taskId: 'task1',
    timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: 'm9',
    threadId: 't1',
    type: 'task-created',
    content: 'Created task: Implement responsive navigation',
    senderId: 'u1',
    taskId: 'task3',
    timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'm10',
    threadId: 't1',
    type: 'text',
    content: 'Navigation is blocked until the design tokens are finalized. I\'ll start once that\'s done.',
    senderId: 'u3',
    timestamp: new Date(now - 1000 * 60 * 60 * 20).toISOString()
  },
  {
    id: 'm11',
    threadId: 't1',
    type: 'text',
    content: 'Tokens are done now -- go ahead and start on the nav!',
    senderId: 'u2',
    timestamp: new Date(now - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'm20',
    threadId: 't2',
    type: 'system',
    content: 'You created this project',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 96).toISOString()
  },
  {
    id: 'm21',
    threadId: 't2',
    type: 'task-created',
    content: 'Created task: Set up React Native project',
    senderId: 'u1',
    taskId: 'task5',
    timestamp: new Date(now - 1000 * 60 * 60 * 96).toISOString()
  },
  {
    id: 'm22',
    threadId: 't2',
    type: 'status-change',
    content: 'marked Set up React Native project as done',
    senderId: 'u3',
    taskId: 'task5',
    timestamp: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    metadata: { from: 'in-progress', to: 'done' }
  },
  {
    id: 'm23',
    threadId: 't2',
    type: 'task-created',
    content: 'Created task: Build authentication flow',
    senderId: 'u3',
    taskId: 'task6',
    timestamp: new Date(now - 1000 * 60 * 60 * 36).toISOString()
  },
  {
    id: 'm24',
    threadId: 't2',
    type: 'text',
    content: 'Auth flow is coming along. I\'m using the new secure token approach. Should be ready for review by tomorrow.',
    senderId: 'u4',
    timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'm25',
    threadId: 't2',
    type: 'task-created',
    content: 'Created task: Design app icon and splash screen',
    senderId: 'u4',
    taskId: 'task7',
    timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'm26',
    threadId: 't2',
    type: 'text',
    content: 'Icon and splash screen are ready for review. I went with a minimal approach.',
    senderId: 'u4',
    timestamp: new Date(now - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'm30',
    threadId: 't3',
    type: 'system',
    content: 'You created this group',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'm31',
    threadId: 't3',
    type: 'task-created',
    content: 'Created task: Write blog launch announcement',
    senderId: 'u1',
    taskId: 'task8',
    timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString()
  },
  {
    id: 'm32',
    threadId: 't3',
    type: 'text',
    content: 'I\'ll start the draft today. Any key features you want highlighted?',
    senderId: 'u5',
    timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString()
  },
  {
    id: 'm33',
    threadId: 't3',
    type: 'text',
    content: 'Focus on the real-time collaboration and the mobile-first approach. Those are our key differentiators.',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 'm40',
    threadId: 't4',
    type: 'text',
    content: 'Hey, do you have the brand guidelines PDF?',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString()
  },
  {
    id: 'm41',
    threadId: 't4',
    type: 'text',
    content: 'Yes! I\'ll share it in the Website Redesign thread. Give me 5 minutes.',
    senderId: 'u2',
    timestamp: new Date(now - 1000 * 60 * 60 * 7).toISOString()
  },
  {
    id: 'm42',
    threadId: 't4',
    type: 'text',
    content: 'Perfect, thanks!',
    senderId: 'u1',
    timestamp: new Date(now - 1000 * 60 * 60 * 7).toISOString()
  },
  {
    id: 'm50',
    threadId: 't5',
    type: 'system',
    content: 'Jordan Lee created this project',
    senderId: 'u4',
    timestamp: new Date(now - 1000 * 60 * 60 * 48).toISOString()
  },
  {
    id: 'm51',
    threadId: 't5',
    type: 'task-created',
    content: 'Created task: Fix login redirect loop on Safari',
    senderId: 'u4',
    taskId: 'task9',
    timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'm52',
    threadId: 't5',
    type: 'text',
    content: 'This is a P0 -- multiple users are reporting this on Safari 17.3+. Blocking the auth team.',
    senderId: 'u4',
    timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString()
  },
  {
    id: 'm53',
    threadId: 't5',
    type: 'task-created',
    content: 'Created task: Memory leak in dashboard charts',
    senderId: 'u2',
    taskId: 'task10',
    timestamp: new Date(now - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'm54',
    threadId: 't5',
    type: 'text',
    content: 'I\'ve narrowed down the memory leak. It\'s the real-time chart subscriptions not being cleaned up properly.',
    senderId: 'u3',
    timestamp: new Date(now - 1000 * 60 * 60 * 6).toISOString()
  }
]

export const SEED_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tmpl1',
    name: 'Bug Report',
    description: 'Standard bug report with reproduction steps',
    defaultPriority: 'high',
    defaultTags: ['bug'],
    subtasks: [
      { title: 'Reproduce the issue' },
      { title: 'Identify root cause' },
      { title: 'Implement fix' },
      { title: 'Write tests' },
      { title: 'Deploy fix' }
    ]
  },
  {
    id: 'tmpl2',
    name: 'Feature Request',
    description: 'New feature with design and implementation phases',
    defaultPriority: 'medium',
    defaultTags: ['feature'],
    subtasks: [
      { title: 'Write requirements' },
      { title: 'Create design mockups' },
      { title: 'Implement feature' },
      { title: 'QA testing' }
    ]
  },
  {
    id: 'tmpl3',
    name: 'Sprint Task',
    description: 'Standard sprint task with full lifecycle',
    defaultPriority: 'medium',
    defaultTags: ['sprint'],
    subtasks: [
      { title: 'Design' },
      { title: 'Implement' },
      { title: 'Test' },
      { title: 'Code review' }
    ]
  },
  {
    id: 'tmpl4',
    name: 'Meeting Action Item',
    description: 'Quick action item from a meeting',
    defaultPriority: 'medium',
    defaultTags: ['action-item'],
    subtasks: []
  }
]

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'assignment',
    threadId: 't1',
    taskId: 'task1',
    title: 'New Assignment',
    body: 'Sarah Chen assigned you to Design new homepage hero section',
    timestamp: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    read: true
  },
  {
    id: 'n2',
    type: 'status-change',
    threadId: 't1',
    taskId: 'task2',
    title: 'Task Completed',
    body: 'Set up design system tokens was marked as done',
    timestamp: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
    read: false
  },
  {
    id: 'n3',
    type: 'comment',
    threadId: 't5',
    taskId: 'task9',
    title: 'New Comment',
    body: 'Jordan Lee commented on Fix login redirect loop on Safari',
    timestamp: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    read: false
  },
  {
    id: 'n4',
    type: 'due-soon',
    threadId: 't2',
    taskId: 'task6',
    title: 'Due Soon',
    body: 'Build authentication flow is due in 2 days',
    timestamp: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    read: false
  }
]
