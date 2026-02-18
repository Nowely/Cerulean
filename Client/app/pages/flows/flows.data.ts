import type { Flow, FlowListItem } from '~/shared/lib'

export const flowList: FlowListItem[] = [
  {
    slug: 'thread-management',
    icon: 'i-lucide-messages-square',
    title: 'Thread Management',
    description: 'Create, search, and switch between conversation threads. Covers thread creation form, real-time search, and thread navigation.'
  },
  {
    slug: 'basic-messaging',
    icon: 'i-lucide-mail',
    title: 'Basic Messaging',
    description: 'Send text messages and use the command palette. Demonstrates message composition, sending, and command shortcuts.'
  },
  {
    slug: 'task-creation-form',
    icon: 'i-lucide-file-plus',
    title: 'Task Creation via Form',
    description: 'Create detailed tasks using the full form with all fields including title, description, status, priority, assignees, due date, and tags.'
  },
  {
    slug: 'task-creation-template',
    icon: 'i-lucide-copy',
    title: 'Task Creation from Template',
    description: 'Quickly create tasks with predefined structures using templates. Includes Bug Report, Feature Request, Sprint Task, and Meeting Action Item templates.'
  },
  {
    slug: 'task-detail-editing',
    icon: 'i-lucide-search',
    title: 'Task Detail & Editing',
    description: 'View complete task details, edit properties, manage status and priority, handle subtasks, and delete tasks.'
  },
  {
    slug: 'notifications',
    icon: 'i-lucide-bell',
    title: 'Notifications',
    description: 'View and manage system notifications for task updates, assignments, comments, and due date reminders.'
  },
  {
    slug: 'mobile-view',
    icon: 'i-lucide-smartphone',
    title: 'Mobile View Navigation',
    description: 'Access and navigate the app on mobile devices with responsive design, hamburger menu, and touch-optimized interactions.'
  }
]

function obs(label: string, description: string) {
  return { label, description }
}

export const flows: Record<string, Flow> = {
  'basic-messaging': {
    slug: 'basic-messaging',
    icon: 'i-lucide-mail',
    title: 'Basic Messaging',
    description: 'Send text messages and use the command palette. Demonstrates message composition, sending, and command shortcuts.',
    summary: 'Send text messages and use command palette in chat threads.',
    steps: [
      {
        title: 'Open Thread',
        label: 'Start',
        action: 'Select a thread from the sidebar to open the chat view.',
        result: 'Chat view displays messages grouped by date, task cards with status badges, and message input at the bottom.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Pinned: Website Redesign', 'Pinned: Mobile App Sprint', 'All Threads: Bug Triage'],
            activeItem: 'Website Redesign'
          },
          main: {
            header: ['Thread: Website Redesign', 'Today'],
            items: ['Jordan: Ready to finalize tokens.', 'Task card: Set up design system tokens'],
            composer: 'Message or type \'/\' for commands...'
          }
        },
        highlights: ['sidebar'],
        annotations: [
          { target: 'sidebar', position: 'right', text: 'Thread list shows pinned and recent threads', icon: 'i-lucide-sidebar' }
        ]
      },
      {
        title: 'Type Message',
        label: 'Input',
        action: 'Click in the message input field and type your message.',
        result: 'Input field becomes focused. Text appears as you type. Send button becomes enabled.',
        wireframe: {
          showSidebar: true,
          sidebar: { items: ['Active: Website Redesign', 'Recent: Mobile App Sprint'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Previous messages...'],
            composer: 'Message or type \'/\' for commands...',
            composerFocused: true,
            composerValue: 'Great work on the tokens!'
          }
        },
        highlights: ['composer-input'],
        annotations: [
          { target: 'composer-input', position: 'top', text: 'Composer supports text and slash commands', icon: 'i-lucide-type' }
        ]
      },
      {
        title: 'Send Message',
        label: 'Submit',
        action: 'Click the send button or press Enter to send.',
        result: 'Message appears in chat with avatar and timestamp. Toast confirms success. Input clears automatically.',
        wireframe: {
          showSidebar: true,
          sidebar: { items: ['Last: Great work on the tokens...'] },
          main: {
            header: ['Thread: Website Redesign', 'Today'],
            items: ['You: Great work on the tokens! This will really help with consistency.'],
            composer: 'Message or type \'/\' for commands...',
            toast: 'Message sent'
          }
        },
        highlights: ['toast'],
        annotations: [
          { target: 'toast', position: 'bottom', text: 'Toast notifications confirm actions', icon: 'i-lucide-check-circle' }
        ]
      },
      {
        title: 'Command Palette',
        label: 'Commands',
        action: 'Type "/" in the input to open the command palette.',
        result: 'Command palette shows available actions: /task and /template.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Messages...'],
            composer: 'Message or type \'/\' for commands...',
            composerValue: '/',
            showCommandPalette: true
          },
          panel: {
            title: 'Commands',
            type: 'command-palette',
            items: ['/task - Create a new task', '/template - Use a task template']
          }
        },
        highlights: ['command-palette'],
        annotations: [
          { target: 'command-palette', position: 'top', text: 'Slash commands for quick actions', icon: 'i-lucide-terminal' }
        ]
      }
    ],
    observations: [
      obs('Message Grouping', 'Messages grouped by sender with avatars on sender change'),
      obs('Date Separators', 'Automatic date chips separate conversation days'),
      obs('Real-time Updates', 'Sidebar shows latest message preview'),
      obs('Command Palette', 'Type "/" for quick task/template access'),
      obs('Keyboard Shortcuts', 'Enter sends, making chat fast'),
      obs('Visual Feedback', 'Send button state changes with input')
    ]
  },
  'thread-management': {
    slug: 'thread-management',
    icon: 'i-lucide-messages-square',
    title: 'Thread Management',
    description: 'Create, search, and switch between conversation threads. Covers thread creation form, real-time search, and thread navigation.',
    summary: 'Create, search, and switch between conversation threads.',
    steps: [
      {
        title: 'View Threads',
        label: 'Browse',
        action: 'View the sidebar showing pinned and all threads.',
        result: 'Sidebar displays pinned threads at top, followed by all other threads sorted by activity.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Pinned: Website Redesign', 'Pinned: Mobile App Sprint', 'All Threads: Bug Triage', 'All Threads: Design Review']
          },
          main: {
            header: ['Welcome'],
            items: ['Select a thread to start chatting.']
          }
        },
        highlights: ['sidebar'],
        annotations: [
          { target: 'sidebar', position: 'right', text: 'Threads organized into Pinned and All sections', icon: 'i-lucide-list' }
        ]
      },
      {
        title: 'Search Threads',
        label: 'Filter',
        action: 'Click search and type to filter threads.',
        result: 'Thread list filters in real-time as you type.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            search: 'bug',
            searchFocused: true,
            items: ['Result: Bug Triage']
          },
          main: {
            header: ['Welcome'],
            items: ['Filtered results shown in sidebar']
          }
        },
        highlights: ['search-input'],
        annotations: [
          { target: 'search-input', position: 'bottom', text: 'Real-time search filtering', icon: 'i-lucide-search' }
        ]
      },
      {
        title: 'Create Thread',
        label: 'New',
        action: 'Click the + button to create a new thread.',
        result: 'Dialog opens with name input and type selection.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['+ button clicked'] },
          main: {
            header: ['Background thread'],
            items: ['Thread content visible behind dialog']
          },
          panel: {
            title: 'New Thread',
            type: 'new-thread',
            items: ['Title: New Thread', 'Type: Project Group Direct', 'Thread name: Q1 Planning Session', 'Selected type: Group', 'Create button enabled']
          }
        },
        highlights: ['panel', 'new-thread-btn'],
        annotations: [
          { target: 'panel', position: 'left', text: 'Choose thread type: Project, Group, or Direct', icon: 'i-lucide-plus-circle' }
        ]
      },
      {
        title: 'Thread Created',
        label: 'Success',
        action: 'Submit the form to create the thread.',
        result: 'Toast confirms creation. New thread appears in sidebar and opens automatically.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Pinned: Website Redesign', 'All Threads: Q1 Planning Session'],
            activeItem: 'Q1 Planning Session'
          },
          main: {
            header: ['Q1 Planning Session', '1 member'],
            items: ['Empty chat - start the conversation!'],
            composer: 'Message or type \'/\' for commands...',
            toast: 'Thread created - Q1 Planning Session is ready'
          }
        },
        highlights: ['toast', 'sidebar'],
        annotations: [
          { target: 'toast', position: 'bottom', text: 'Success feedback via toast', icon: 'i-lucide-check' }
        ]
      },
      {
        title: 'Switch Thread',
        label: 'Navigate',
        action: 'Click a different thread to switch context.',
        result: 'Active thread changes, chat loads with full history and metadata.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Active: Website Redesign', 'Q1 Planning Session'],
            activeItem: 'Website Redesign'
          },
          main: {
            header: ['Website Redesign', '3 members', '4 tasks'],
            items: ['Full message history loaded', 'Task cards visible', 'Member activity shown']
          }
        },
        highlights: ['sidebar'],
        annotations: [
          { target: 'sidebar', position: 'right', text: 'Click to switch between threads instantly', icon: 'i-lucide-arrow-right-left' }
        ]
      }
    ],
    observations: [
      obs('Thread Sections', 'Pinned and All Threads for organization'),
      obs('Real-time Search', 'Filters as you type'),
      obs('Thread Metadata', 'Shows last message, timestamp, unread count'),
      obs('Auto-selection', 'New threads open automatically'),
      obs('Thread Types', 'Project, Group, or Direct'),
      obs('Form Validation', 'Create button disabled until name entered')
    ]
  },
  'task-creation-form': {
    slug: 'task-creation-form',
    icon: 'i-lucide-file-plus',
    title: 'Task Creation via Form',
    description: 'Create detailed tasks using the full form with all fields including title, description, status, priority, assignees, due date, and tags.',
    summary: 'Create detailed tasks using the full task form with all fields.',
    steps: [
      {
        title: 'Open Form',
        label: 'Launch',
        action: 'Type /task or click Quick Actions > New Task.',
        result: 'Task form opens with all fields: Title (required), Description, Status, Priority, Assignees, Due Date, Tags.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Background chat visible']
          },
          panel: {
            title: 'New Task',
            type: 'task-form',
            items: ['Title (required, focused)', 'Description textarea', 'Status: To Do, Priority: Medium', 'Assignees | Due Date | Tags', 'Create button disabled']
          }
        },
        highlights: ['panel'],
        annotations: [
          { target: 'panel', position: 'left', text: 'Full task form with all metadata fields', icon: 'i-lucide-file-plus' }
        ]
      },
      {
        title: 'Fill Details',
        label: 'Input',
        action: 'Enter task title, description, set priority, add assignee and tags.',
        result: 'All fields populate. Priority button shows selection. Assignee avatar appears. Tags display. Create button enables.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Thread members available'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Form open']
          },
          panel: {
            title: 'New Task',
            type: 'task-form',
            items: ['Title: Update color palette documentation', 'Description: Document the new color tokens...', 'Priority: High', 'Assignee: Sarah Chen', 'Tags: documentation, design-system', 'Create button enabled']
          }
        },
        highlights: ['panel'],
        annotations: [
          { target: 'panel', position: 'left', text: 'Required title enables the Create button', icon: 'i-lucide-check-circle' }
        ]
      },
      {
        title: 'Task Created',
        label: 'Submit',
        action: 'Click Create Task to submit.',
        result: 'Toast confirms success. Task card appears in chat. Sidebar updates. Form closes.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['You: Created task: Update color palette...'],
            activeItem: 'Website Redesign'
          },
          main: {
            header: ['Website Redesign', '5 tasks'],
            items: ['Task card: Update color palette documentation', 'Status: To Do | Priority: High', 'Assigned: Sarah Chen'],
            toast: 'Task created - Update color palette documentation',
            composer: 'Message or type \'/\' for commands...'
          }
        },
        highlights: ['toast', 'message-0'],
        annotations: [
          { target: 'message-0', position: 'top', text: 'Task cards appear in chat with full metadata', icon: 'i-lucide-list-checks' }
        ]
      }
    ],
    observations: [
      obs('Form Validation', 'Create disabled until title filled'),
      obs('Multi-assign', 'Can assign to multiple members'),
      obs('Status Options', 'To Do, In Progress, Review, Done, Blocked'),
      obs('Priority Levels', 'Low, Medium, High, Urgent with colors'),
      obs('Tag Parsing', 'Comma-separated tags'),
      obs('Chat Integration', 'Created tasks appear as rich cards')
    ]
  },
  'task-creation-template': {
    slug: 'task-creation-template',
    icon: 'i-lucide-copy',
    title: 'Task Creation from Template',
    description: 'Quickly create tasks with predefined structures using templates. Includes Bug Report, Feature Request, Sprint Task, and Meeting Action Item templates.',
    summary: 'Quickly create tasks with predefined structures using templates.',
    steps: [
      {
        title: 'Access Templates',
        label: 'Open',
        action: 'Type /template or click Quick Actions > From Template.',
        result: 'Template picker opens showing 4 pre-configured templates with icons and subtask counts.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Background visible']
          },
          panel: {
            title: 'Task Templates',
            type: 'template-picker',
            items: ['Bug Report (5 subtasks)', 'Feature Request (4 subtasks)', 'Sprint Task (4 subtasks)', 'Meeting Action Item (0 subtasks)']
          }
        },
        highlights: ['panel'],
        annotations: [
          { target: 'panel', position: 'left', text: 'Pre-built templates for common workflows', icon: 'i-lucide-copy' }
        ]
      },
      {
        title: 'Select Template',
        label: 'Choose',
        action: 'Click a template to create the task(s).',
        result: 'Template creates task with all predefined fields and subtasks automatically.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Task created from template...'],
            activeItem: 'Website Redesign'
          },
          main: {
            header: ['Website Redesign'],
            items: ['Task card: Bug Report - Login issue', 'Subtasks: 5 items', 'Pre-filled description and tags'],
            toast: 'Task created from Bug Report template',
            composer: 'Message or type \'/\' for commands...'
          }
        },
        highlights: ['toast'],
        annotations: [
          { target: 'toast', position: 'bottom', text: 'One-click task creation with subtasks', icon: 'i-lucide-zap' }
        ]
      }
    ],
    observations: [
      obs('Quick Access', 'Via /template command or Quick Actions'),
      obs('Template Types', 'Bug Report, Feature Request, Sprint Task, Meeting Action'),
      obs('Subtask Auto-create', 'Templates with subtasks create parent + children'),
      obs('Pre-filled Data', 'Titles, descriptions, status, priority included'),
      obs('Visual Count', 'Each template shows subtask count'),
      obs('Efficiency', 'One click creates complete task structure')
    ]
  },
  'task-detail-editing': {
    slug: 'task-detail-editing',
    icon: 'i-lucide-search',
    title: 'Task Detail & Editing',
    description: 'View complete task details, edit properties, manage status and priority, handle subtasks, and delete tasks.',
    summary: 'View complete task details, edit properties, manage status/priority.',
    steps: [
      {
        title: 'Open Task',
        label: 'Select',
        action: 'Click any task card in the chat to open details.',
        result: 'Detail drawer shows: title, creator, description, status dropdown, priority dropdown, due date, assignees, tags, subtasks progress, edit/delete buttons.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Task card clicked: Set up design system tokens']
          },
          panel: {
            title: 'Task Details',
            type: 'task-detail',
            items: ['Status dropdown | Priority dropdown', 'Due date | Assignees | Tags', 'Description full text', 'Subtasks: 2/5 completed', 'Edit button | Delete button']
          }
        },
        highlights: ['panel', 'message-0'],
        annotations: [
          { target: 'panel', position: 'left', text: 'Full task details with quick-edit dropdowns', icon: 'i-lucide-list-checks' }
        ]
      },
      {
        title: 'Edit Properties',
        label: 'Modify',
        action: 'Change status or priority using dropdowns, or click Edit for full form.',
        result: 'Changes save immediately. Status changes create system messages in chat.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['System: Status changed to In Progress', 'Task card: Set up design system tokens', 'Status badge updated'],
            toast: 'Task updated'
          },
          panel: {
            title: 'Task Details',
            type: 'task-detail',
            items: ['Status: In Progress (changed)', 'Priority: High', 'Changes reflected in chat']
          }
        },
        highlights: ['toast'],
        annotations: [
          { target: 'toast', position: 'bottom', text: 'Status changes logged in chat history', icon: 'i-lucide-history' }
        ]
      }
    ],
    observations: [
      obs('Quick Status', 'Change status directly from detail view'),
      obs('Visual Status', 'Icons for To Do, In Progress, Review, Done, Blocked'),
      obs('Priority Colors', 'Low (gray), Medium (blue), High (orange), Urgent (red)'),
      obs('Due Date Warnings', 'Overdue = red, due soon = yellow'),
      obs('Subtask Progress', 'Progress bar shows completion ratio'),
      obs('Delete Confirm', 'Confirmation prevents accidental deletion')
    ]
  },
  'notifications': {
    slug: 'notifications',
    icon: 'i-lucide-bell',
    title: 'Notifications',
    description: 'View and manage system notifications for task updates, assignments, comments, and due date reminders.',
    summary: 'View, manage, and interact with system notifications.',
    steps: [
      {
        title: 'Open Panel',
        label: 'View',
        action: 'Click the bell icon in the header (shows unread count badge).',
        result: 'Notification panel slides in showing all notifications sorted by time. Unread items have green dot indicators.',
        wireframe: {
          showSidebar: true,
          showPanel: true,
          sidebar: { items: ['Active thread'] },
          main: {
            header: ['Thread: Website Redesign'],
            items: ['Bell icon shows 4 unread']
          },
          panel: {
            title: 'Notifications (4)',
            type: 'notifications',
            items: ['New Assignment - Sarah assigned you - 1m ago', 'Task Completed - Bug fix merged - 12h ago', 'New Comment - Jordan replied - 4h ago', 'Due Soon - Task due tomorrow - 1h ago']
          }
        },
        highlights: ['panel', 'bell-icon'],
        annotations: [
          { target: 'bell-icon', position: 'bottom', text: 'Badge shows unread count', icon: 'i-lucide-bell' }
        ]
      },
      {
        title: 'Interact',
        label: 'Action',
        action: 'Click a notification to mark as read and navigate to relevant content.',
        result: 'Notification marked read. Navigates to thread/task. Panel can stay open or close.',
        wireframe: {
          showSidebar: true,
          sidebar: {
            items: ['Active: Design Review'],
            activeItem: 'Design Review'
          },
          main: {
            header: ['Design Review', '2 members'],
            items: ['Navigated to thread from notification', 'Task card visible'],
            toast: 'Marked as read'
          }
        },
        highlights: ['sidebar'],
        annotations: [
          { target: 'sidebar', position: 'right', text: 'Click notification to navigate', icon: 'i-lucide-external-link' }
        ]
      }
    ],
    observations: [
      obs('Notification Types', 'Assignment, Completed, Comment, Due Soon, Thread Created'),
      obs('Visual Icons', 'Each type has unique icon and color'),
      obs('Unread Dots', 'Green badges mark unread items'),
      obs('Badge Count', 'Bell icon shows total unread'),
      obs('Mark All', 'Bulk action to clear all'),
      obs('Auto-generate', 'Notifications for assignments, status changes, comments, due dates')
    ]
  },
  'mobile-view': {
    slug: 'mobile-view',
    icon: 'i-lucide-smartphone',
    title: 'Mobile View Navigation',
    description: 'Access and navigate the app on mobile devices with responsive design, hamburger menu, and touch-optimized interactions.',
    summary: 'Access thread sidebar and navigate the app on mobile devices.',
    steps: [
      {
        title: 'Mobile Chat',
        label: 'View',
        action: 'View the mobile interface with active thread.',
        result: 'Full-width chat with hamburger menu, compact header, message input at bottom. Sidebar hidden to maximize space.',
        wireframe: {
          isMobile: true,
          sidebar: { items: ['Hidden - tap hamburger to open'] },
          main: {
            header: ['Hamburger', 'Website Redesign', 'Bell: 4'],
            items: ['Task card + messages', 'Full-width content'],
            composer: 'Message input + quick actions'
          }
        },
        highlights: ['header'],
        annotations: [
          { target: 'header', position: 'bottom', text: 'Compact header with essential controls', icon: 'i-lucide-smartphone' }
        ]
      },
      {
        title: 'Open Sidebar',
        label: 'Navigate',
        action: 'Tap hamburger menu to open mobile sidebar.',
        result: 'Sidebar slides in as overlay. Background dims. Shows profile, search, threads list.',
        wireframe: {
          isMobile: true,
          showSidebar: true,
          sidebar: {
            title: 'Mobile Drawer',
            items: ['Profile: You / TaskChat', 'Search threads', 'Pinned: Website Redesign', 'All Threads: Bug Triage']
          },
          main: {
            header: ['Background dimmed'],
            items: ['Chat visible behind overlay']
          }
        },
        highlights: ['sidebar'],
        annotations: [
          { target: 'sidebar', position: 'right', text: 'Slide-over drawer for mobile navigation', icon: 'i-lucide-panel-left' }
        ]
      }
    ],
    observations: [
      obs('Responsive Layout', 'Auto-adapts at ~768px breakpoint'),
      obs('Sidebar Overlay', 'Slide-over drawer preserves chat space'),
      obs('Touch Targets', 'Larger tap areas for mobile'),
      obs('Bottom Sheets', 'Forms/details slide up from bottom'),
      obs('Single Column', 'Clear focused layout'),
      obs('Gesture Support', 'Swipe to open/close sidebar')
    ]
  }
}

export function getFlow(slug: string): Flow | undefined {
  return flows[slug]
}

export function getFlowList(): FlowListItem[] {
  return flowList
}
