import fs from 'fs';
import path from 'path';

/**
 * Personal context interfaces
 */
export interface RoleInfo {
  title: string;
  reportsTo: string;
  mission: string;
}

export interface CompanyInfo {
  name: string;
  product: string;
  marketPosition: string;
  targetMarket: string;
  keyDifferentiator: string;
}

export interface TeamMember {
  name: string;
  role: string;
  email?: string;
}

export interface KPITarget {
  metric: string;
  target: string;
  ownership: 'primary' | 'shared' | 'leading';
}

export interface Challenge {
  priority: 'immediate' | 'strategic';
  title: string;
  description: string;
}

export interface PersonalContext {
  role: RoleInfo;
  company: CompanyInfo;
  teams: TeamMember[];
  responsibilities: Record<string, string[]>;
  kpis: KPITarget[];
  challenges: Challenge[];
  workingStyle: Record<string, any>;
  tools: Record<string, string[]>;
  decisionFramework: Record<string, string[]>;
  contextGuidance: Record<string, string[]>;
  rawMarkdown: string;
}

// Cache for parsed context
let cachedContext: PersonalContext | null = null;
let lastLoadTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse markdown content into structured context
 */
function parseMarkdownContext(content: string): PersonalContext {
  // For now, we'll return a structured version with the raw markdown
  // In production, you might want to parse specific sections
  const context: PersonalContext = {
    role: {
      title: 'VP of Revenue Operations & Player-Coach for Sales',
      reportsTo: 'CEO (Humberto)',
      mission: 'Build a repeatable, predictable, and data-driven revenue system'
    },
    company: {
      name: 'Opus',
      product: 'Comprehensive EHR + CRM + RCM platform for behavioral health providers',
      marketPosition: 'Competing with SimplePractice, TherapyNotes, Tebra, Kareo, Nextstep, and Intake-Q',
      targetMarket: 'Mid-sized behavioral health practices (10-50 providers)',
      keyDifferentiator: 'All-in-one platform with integrated RCM services'
    },
    teams: [
      { name: 'Adi', role: 'VP Revenue Operations & Player-Coach for Sales' },
      { name: 'Gabriel', role: 'Right Hand (scheduling, follow-ups, proposals)' },
      { name: 'Janelle Hall', role: 'Onboarding Director' },
      { name: 'John', role: 'Support Lead' },
      { name: 'Shawn', role: 'Marketing Lead' },
      { name: 'Hector', role: 'Engineering Lead' },
      { name: 'Humberto', role: 'CEO' }
    ],
    responsibilities: {
      'Sales Operations': [
        'Lead generation and pipeline management',
        'Demo execution and lead qualification',
        'Proposal creation and negotiation',
        'Close deals as player-coach',
        'Coach and enable sales team'
      ],
      'Revenue Operations': [
        'Build and optimize sales processes and playbooks',
        'Manage marketing ops and lead routing',
        'Own revenue analytics and forecasting',
        'Design and implement sales compensation',
        'Drive cross-functional revenue initiatives'
      ],
      'Onboarding Operations': [
        'Co-own implementation quality metrics with Janelle',
        'Improve time-to-value for new clients',
        'Reduce churn through better onboarding',
        'Scale implementation processes'
      ]
    },
    kpis: [
      { metric: 'Pipeline Generated', target: '≥$300K/month', ownership: 'primary' },
      { metric: 'New ARR', target: '≥$50K/month', ownership: 'primary' },
      { metric: 'Sales Cycle', target: '<120 days', ownership: 'primary' },
      { metric: 'Close Rate', target: '≥15%', ownership: 'primary' },
      { metric: 'Demo-to-Opportunity Rate', target: '≥60%', ownership: 'primary' },
      { metric: 'SQL-to-Close Rate', target: '≥20%', ownership: 'primary' },
      { metric: '90% On-Time Go-Live Rate', target: '90%', ownership: 'shared' },
      { metric: 'Month-1 Churn', target: '<5%', ownership: 'shared' },
      { metric: 'NPS', target: '≥50', ownership: 'shared' },
      { metric: 'Demos scheduled per week', target: '≥5', ownership: 'leading' },
      { metric: 'Discovery calls completed', target: '≥10/week', ownership: 'leading' },
      { metric: 'Proposals sent', target: '≥3/week', ownership: 'leading' },
      { metric: 'Pipeline coverage ratio', target: '≥3x', ownership: 'leading' }
    ],
    challenges: [
      {
        priority: 'immediate',
        title: 'Pipeline Acceleration',
        description: 'Building more top-of-funnel to hit Q1 targets'
      },
      {
        priority: 'immediate',
        title: 'Demo Efficiency',
        description: 'Reducing demo time from 90 to 60 minutes while maintaining quality'
      },
      {
        priority: 'immediate',
        title: 'RCM Partner Issues',
        description: 'Multiple implementation delays due to RCM partner handoffs'
      },
      {
        priority: 'immediate',
        title: 'Sales Collateral',
        description: 'Need updated battle cards and competitive positioning docs'
      },
      {
        priority: 'immediate',
        title: 'Lead Quality',
        description: 'Marketing leads converting at <5%, need better qualification'
      },
      {
        priority: 'strategic',
        title: 'Sales Playbook v2.0',
        description: 'Documenting and systematizing what works'
      },
      {
        priority: 'strategic',
        title: 'RevOps Tech Stack',
        description: 'Implementing proper sales analytics and forecasting'
      },
      {
        priority: 'strategic',
        title: 'Partner Channel',
        description: 'Exploring referral partnerships with consultants'
      },
      {
        priority: 'strategic',
        title: 'Pricing Optimization',
        description: 'Testing value-based pricing models'
      },
      {
        priority: 'strategic',
        title: 'Customer Success Handoff',
        description: 'Building better post-sale transition process'
      }
    ],
    workingStyle: {
      communication: {
        style: ['Direct and action-oriented', 'Data-driven decision making', 'Prefer bullet points over long prose', 'Focus on outcomes, not activities'],
        preferences: ['Async over sync when possible', 'Written documentation for decisions', 'Video for complex explanations', 'Quick Slack for urgent items', 'Email for external/formal only']
      },
      meetings: {
        weekly: 'Pipeline review (Mondays)',
        daily: 'Standup with Gabriel (8:30am)',
        biweekly: '1:1 with Humberto',
        monthly: 'Revenue review with leadership'
      },
      delegation: {
        gabriel: ['Meeting scheduling', 'Follow-up emails', 'Proposal first drafts'],
        janelle: ['All implementation execution'],
        adi: ['Strategy', 'Closing deals', 'Process design']
      }
    },
    tools: {
      daily: ['HubSpot CRM', 'Asana', 'Slack', 'Gmail', 'Looker', 'Excel', 'Zoom'],
      integrations: ['HubSpot ↔ Asana (via Zapier)', 'Gmail ↔ HubSpot', 'Calendly → HubSpot', 'Looker → PostgreSQL']
    },
    decisionFramework: {
      escalate: ['Deals >$100K ARR', 'Non-standard contract terms', 'Product feature commitments', 'Pricing exceptions >20%', 'Strategic partnership opportunities'],
      approve: ['Discounts up to 20%', 'Standard implementation timeline', 'Lead qualification and routing'],
      needApproval: ['Custom development', 'Exclusive territories']
    },
    contextGuidance: {
      brainstorming: [
        'Always consider impact on pipeline and revenue',
        'Think about scalability from day one',
        'Balance quick wins with strategic initiatives',
        'Consider Gabriel and Janelle\'s bandwidth',
        'Keep compliance and healthcare regulations in mind'
      ],
      taskCreation: [
        'Default project: Revenue Operations (unless specified)',
        'Default assignee: Adi (unless explicitly delegating)',
        'Urgency indicators: "pipeline", "demo", "close", "RCM issue"',
        'Always include acceptance criteria',
        'Link to relevant deals/accounts when applicable'
      ],
      analysis: [
        'Focus on trends, not point-in-time metrics',
        'Always include actionable recommendations',
        'Consider both leading and lagging indicators',
        'Benchmark against industry standards',
        'Highlight risks and opportunities'
      ],
      neverAssume: [
        'Which project a task belongs to (RevOps vs Onboarding)',
        'That Gabriel should handle something (explicit delegation only)',
        'That a standard process exists (often building from scratch)',
        'That marketing leads are qualified',
        'That RCM partner will deliver on time'
      ]
    },
    rawMarkdown: content
  };

  return context;
}

/**
 * Load personal context from markdown file
 */
export function loadPersonalContext(): PersonalContext {
  // Check cache
  const now = Date.now();
  if (cachedContext && (now - lastLoadTime) < CACHE_TTL) {
    return cachedContext;
  }

  try {
    // Load the markdown file
    const contextPath = path.join(process.cwd(), 'config', 'adi-context.md');
    const content = fs.readFileSync(contextPath, 'utf-8');

    // Parse into structured format
    const context = parseMarkdownContext(content);

    // Update cache
    cachedContext = context;
    lastLoadTime = now;

    return context;
  } catch (error) {
    console.error('Error loading personal context:', error);
    // Return a minimal context if file can't be loaded
    return {
      role: {
        title: 'VP of Revenue Operations',
        reportsTo: 'CEO',
        mission: 'Build revenue systems'
      },
      company: {
        name: 'Opus',
        product: 'EHR/CRM/RCM for behavioral health',
        marketPosition: 'Competitive',
        targetMarket: 'Behavioral health practices',
        keyDifferentiator: 'All-in-one platform'
      },
      teams: [],
      responsibilities: {},
      kpis: [],
      challenges: [],
      workingStyle: {},
      tools: {},
      decisionFramework: {},
      contextGuidance: {},
      rawMarkdown: ''
    };
  }
}

/**
 * Format personal context for system prompt injection
 */
export function formatContextForPrompt(): string {
  const context = loadPersonalContext();

  // Return the raw markdown for maximum flexibility
  // The system prompt will handle how to use it
  return context.rawMarkdown;
}

/**
 * Get specific context guidance for different modes
 */
export function getContextGuidance(mode: 'brainstorming' | 'taskCreation' | 'analysis' | 'general'): string[] {
  const context = loadPersonalContext();

  switch (mode) {
    case 'brainstorming':
      return context.contextGuidance.brainstorming || [];
    case 'taskCreation':
      return context.contextGuidance.taskCreation || [];
    case 'analysis':
      return context.contextGuidance.analysis || [];
    default:
      return [];
  }
}

/**
 * Check if context is available
 */
export function isPersonalContextAvailable(): boolean {
  try {
    const contextPath = path.join(process.cwd(), 'config', 'adi-context.md');
    return fs.existsSync(contextPath);
  } catch {
    return false;
  }
}