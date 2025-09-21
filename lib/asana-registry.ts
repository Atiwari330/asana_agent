/**
 * Asana Registry Configuration
 * This module provides type-safe access to the Asana registry configuration
 */

import fs from 'fs';
import path from 'path';

// Type definitions for registry structure
export interface Person {
  email: string;
  name: string;
  aliases: string[];
  role: string;
  department: string;
  active: boolean;
}

export interface ProjectContext {
  summary: string;
  primary_contact?: {
    name: string;
    email: string;
    role: string;
  } | null;
  email_policy?: {
    always_cc: string[];
    bcc_never: boolean;
    signature_hint: string;
  } | null;
  task_guidance?: {
    title_rules: string[];
    notes_template: string;
  } | null;
  sla?: {
    default_due_days_from_now: number;
    escalation_contact: string;
  } | null;
  rules?: Array<{
    when: { contains_any: string[] };
    then: { append_note: string };
  }>;
}

export interface Project {
  id: string;
  name: string;
  aliases: string[];
  type: 'personal' | 'departmental' | 'initiative' | 'deal' | 'client';
  description: string;
  owners: string[];
  stakeholders: {
    primary: string[];
    secondary: string[];
  };
  allowed_assignees: string[];
  sections: Array<{
    name: string;
    id: string;
  }>;
  defaults: {
    section_id: string | null;
    due_days_from_now: number;
  };
  custom_fields: Array<{
    name: string;
    id: string;
    type: 'enum' | 'text' | 'number';
    value_hints: string[];
  }>;
  routing_keywords: string[];
  notes_guidance: string;
  context: ProjectContext;
  active: boolean;
}

export interface Template {
  title_prefix: string;
  description_template: string;
}

export interface Registry {
  version: string;
  meta: {
    workspace_gid: string;
    timezone: string;
    date_format: string;
  };
  policy: {
    allow_general_chat: boolean;
    one_task_per_message: boolean;
    on_unknown_project: 'ask' | 'reject';
    on_unknown_person: 'ask' | 'reject';
  };
  defaults: {
    default_project_id: string | null;
    default_assignee_email: string;
    default_due_days_from_now: number;
  };
  people: Person[];
  projects: Project[];
  templates: Record<string, Template>;
}

// Singleton pattern for registry loading
let registryCache: Registry | null = null;

/**
 * Load and parse the registry configuration
 * Uses singleton pattern to avoid multiple file reads
 */
export function loadRegistry(): Registry {
  if (registryCache) {
    return registryCache;
  }

  try {
    // In production, this path might need adjustment based on deployment
    const registryPath = path.join(process.cwd(), 'config', 'opus-registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    registryCache = JSON.parse(registryContent) as Registry;

    // Validate required fields
    if (!registryCache.version || !registryCache.meta || !registryCache.people || !registryCache.projects) {
      throw new Error('Invalid registry format: missing required fields');
    }

    return registryCache;
  } catch (error) {
    console.error('Failed to load registry:', error);
    // Return a minimal valid registry as fallback
    return {
      version: '1.0',
      meta: {
        workspace_gid: '',
        timezone: 'America/New_York',
        date_format: 'YYYY-MM-DD'
      },
      policy: {
        allow_general_chat: true,
        one_task_per_message: true,
        on_unknown_project: 'reject',
        on_unknown_person: 'reject'
      },
      defaults: {
        default_project_id: null,
        default_assignee_email: '',
        default_due_days_from_now: 3
      },
      people: [],
      projects: [],
      templates: {}
    };
  }
}

/**
 * Resolve a person by alias, email, or name
 */
export function resolvePersonByAlias(input: string): Person | null {
  const registry = loadRegistry();
  const normalizedInput = input.toLowerCase().trim();

  for (const person of registry.people) {
    if (!person.active) continue;

    // Check email (exact match)
    if (person.email.toLowerCase() === normalizedInput) {
      return person;
    }

    // Check aliases
    if (person.aliases.some(alias => alias.toLowerCase() === normalizedInput)) {
      return person;
    }

    // Check full name
    if (person.name.toLowerCase() === normalizedInput) {
      return person;
    }

    // Check partial name match (first name, last name)
    const nameParts = person.name.toLowerCase().split(' ');
    if (nameParts.some(part => part === normalizedInput)) {
      return person;
    }
  }

  return null;
}

/**
 * Resolve a project by alias or name
 */
export function resolveProjectByAlias(input: string): Project | null {
  const registry = loadRegistry();
  const normalizedInput = input.toLowerCase().trim();

  for (const project of registry.projects) {
    if (!project.active) continue;

    // Check project name (exact match)
    if (project.name.toLowerCase() === normalizedInput) {
      return project;
    }

    // Check aliases
    if (project.aliases.some(alias => alias.toLowerCase() === normalizedInput)) {
      return project;
    }

    // Check if input contains key routing keywords
    const hasRoutingKeyword = project.routing_keywords.some(keyword =>
      normalizedInput.includes(keyword.toLowerCase())
    );
    if (hasRoutingKeyword) {
      return project;
    }
  }

  return null;
}

/**
 * Get list of available projects for error messages
 */
export function getAvailableProjects(): string[] {
  const registry = loadRegistry();
  return registry.projects
    .filter(p => p.active)
    .map(p => `${p.name} (${p.aliases[0] || 'no alias'})`);
}

/**
 * Get list of available people for error messages
 */
export function getAvailablePeople(): string[] {
  const registry = loadRegistry();
  return registry.people
    .filter(p => p.active)
    .map(p => `${p.name} (${p.aliases[0] || p.email})`);
}

/**
 * Check if an assignee is allowed for a project
 */
export function isAssigneeAllowedForProject(personEmail: string, project: Project): boolean {
  return project.allowed_assignees.includes(personEmail);
}

/**
 * Get allowed assignees for a project with readable names
 */
export function getAllowedAssigneesForProject(project: Project): string[] {
  const registry = loadRegistry();
  return project.allowed_assignees.map(email => {
    const person = registry.people.find(p => p.email === email);
    return person ? `${person.name} (${person.aliases[0] || email})` : email;
  });
}