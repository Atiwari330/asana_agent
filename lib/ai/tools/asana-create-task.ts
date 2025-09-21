import { tool } from 'ai';
import { z } from 'zod';
import { createTaskWithRetry } from '@/lib/asana';
import {
  loadRegistry,
  resolvePersonByAlias,
  resolveProjectByAlias,
  isAssigneeAllowedForProject,
  getAllowedAssigneesForProject,
  getAvailableProjects,
  getAvailablePeople,
  type Project,
} from '@/lib/asana-registry';

/**
 * Format date to YYYY-MM-DD
 * Handles relative dates like "tomorrow", "next week", "next friday"
 */
function formatDueDate(dueInput?: string): string | undefined {
  if (!dueInput) return undefined;

  const today = new Date();
  const normalizedInput = dueInput.toLowerCase().trim();

  // Handle relative dates
  if (normalizedInput.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  if (normalizedInput.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (normalizedInput.includes('next week') || normalizedInput.includes('next monday')) {
    const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  if (normalizedInput.includes('next friday')) {
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  }

  // Handle "in X days"
  const inDaysMatch = normalizedInput.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
  }

  // Try to parse as an actual date
  try {
    const parsedDate = new Date(dueInput);
    if (!isNaN(parsedDate.getTime())) {
      // Ensure the date is not in the past
      if (parsedDate < today) {
        parsedDate.setFullYear(today.getFullYear());
        if (parsedDate < today) {
          parsedDate.setFullYear(today.getFullYear() + 1);
        }
      }
      return parsedDate.toISOString().split('T')[0];
    }
  } catch {
    // Invalid date format
  }

  return undefined;
}

/**
 * Apply project context and rules to generate final task notes
 */
function synthesizeNotes(
  project: Project,
  originalNotes: string | undefined,
  title: string
): string {
  let notes = originalNotes || '';
  const context = project.context;

  // Apply notes template if available
  if (context.task_guidance?.notes_template) {
    // Template substitution with safe defaults
    const template = context.task_guidance.notes_template;

    // Common template variables
    const templateVars: Record<string, string> = {
      '{goal}': originalNotes || 'As specified in title',
      '{details}': originalNotes || 'See task title for details',
      '{acceptance_criteria}': 'Task completed as specified',
      '{acceptance}': 'Task completed successfully',
      '{customer}': 'TBD',
      '{objective}': title,
      '{dependencies}': 'None identified',
      '{focus}': originalNotes || title,
      '{dates}': 'TBD',
      '{issue}': originalNotes || 'As described',
      '{impact}': 'TBD',
      '{steps}': 'TBD',
      '{owner}': 'Assigned person',
      '{company}': 'TBD',
      '{stack}': 'TBD',
      '{pains}': 'TBD',
      '{timeline}': 'TBD',
      '{budget}': 'TBD',
    };

    // Replace all template variables
    notes = template;
    for (const [key, value] of Object.entries(templateVars)) {
      notes = notes.replace(new RegExp(key, 'g'), value);
    }
  }

  // Apply conditional rules based on content
  if (context.rules && context.rules.length > 0) {
    const combinedText = `${title} ${originalNotes || ''}`.toLowerCase();

    for (const rule of context.rules) {
      const matchesCondition = rule.when.contains_any.some(keyword =>
        combinedText.includes(keyword.toLowerCase())
      );

      if (matchesCondition && rule.then.append_note) {
        notes = notes.trim();
        if (notes) {
          notes += '\n\n';
        }
        notes += rule.then.append_note;
      }
    }
  }

  // Add project-specific notes guidance if not already included
  if (project.notes_guidance && !notes.includes(project.notes_guidance)) {
    const guidance = project.notes_guidance;
    notes = notes.trim();
    if (notes) {
      notes = `${guidance}\n\n${notes}`;
    } else {
      notes = guidance;
    }
  }

  return notes.trim() || 'No additional notes.';
}

/**
 * Refine task title based on project rules
 */
function refineTitle(project: Project, originalTitle: string): string {
  let title = originalTitle.trim();

  // Apply title rules if available
  const titleRules = project.context.task_guidance?.title_rules;
  if (titleRules && titleRules.length > 0) {
    // Check if title starts with a strong verb
    const actionVerbs = [
      'create', 'send', 'email', 'confirm', 'schedule', 'deliver',
      'complete', 'review', 'update', 'fix', 'implement', 'analyze',
      'prepare', 'draft', 'finalize', 'submit', 'approve', 'coordinate'
    ];

    const firstWord = title.split(' ')[0].toLowerCase();
    const startsWithVerb = actionVerbs.includes(firstWord);

    // Apply rules
    for (const rule of titleRules) {
      const ruleLower = rule.toLowerCase();

      // Rule: Start with a strong verb
      if (ruleLower.includes('verb') && !startsWithVerb) {
        // Infer an appropriate verb based on content
        if (title.toLowerCase().includes('email') || title.toLowerCase().includes('send')) {
          title = `Send ${title}`;
        } else if (title.toLowerCase().includes('meeting') || title.toLowerCase().includes('call')) {
          title = `Schedule ${title}`;
        } else if (title.toLowerCase().includes('document') || title.toLowerCase().includes('report')) {
          title = `Prepare ${title}`;
        } else {
          title = `Complete ${title}`;
        }
        break; // Only add verb once
      }

      // Rule: Include deliverable and recipient
      if (ruleLower.includes('deliverable') && ruleLower.includes('recipient')) {
        // This is context-dependent and would need more information
        // Keep as-is if we can't determine from the title alone
      }

      // Rule: Include customer name (for certain projects)
      if (ruleLower.includes('customer name')) {
        // Would need to extract from context or notes
        // Keep as-is for now
      }
    }
  }

  return title;
}

/**
 * Calculate default due date based on project and registry settings
 */
function getDefaultDueDate(project: Project): string {
  const registry = loadRegistry();
  const today = new Date();

  // Priority: project SLA > project defaults > registry defaults
  const daysToAdd =
    project.context.sla?.default_due_days_from_now ||
    project.defaults.due_days_from_now ||
    registry.defaults.default_due_days_from_now ||
    3; // Fallback to 3 days

  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + daysToAdd);
  return dueDate.toISOString().split('T')[0];
}

export const asanaCreateTask = tool({
  description: 'Create a task in Asana using the registry allowlist. Only creates tasks when explicitly requested by the user.',
  inputSchema: z.object({
    project: z.string().describe('Project name or alias from user input'),
    assignee: z.string().describe('Person name, email, or alias from user input'),
    title: z.string().describe('Task title - should be clear and action-oriented'),
    notes: z.string().optional().describe('Task description/notes from user input'),
    due_on: z.string().optional().describe('Due date from user input (e.g., "tomorrow", "next Friday", "2025-09-25")'),
  }),
  execute: async ({ project, assignee, title, notes, due_on }) => {
    const registry = loadRegistry();

    // Resolve project from alias
    const resolvedProject = resolveProjectByAlias(project);
    if (!resolvedProject) {
      const availableProjects = getAvailableProjects();

      if (registry.policy.on_unknown_project === 'ask') {
        return {
          success: false,
          error: `I don't recognize the project "${project}". Available projects are: ${availableProjects.join(', ')}. Which one did you mean?`
        };
      } else {
        return {
          success: false,
          error: `Project "${project}" not found in registry. Available projects: ${availableProjects.join(', ')}`
        };
      }
    }

    // Resolve assignee from alias
    const resolvedPerson = resolvePersonByAlias(assignee);
    if (!resolvedPerson) {
      const availablePeople = getAvailablePeople();

      if (registry.policy.on_unknown_person === 'ask') {
        return {
          success: false,
          error: `I don't recognize "${assignee}". Available people are: ${availablePeople.join(', ')}. Who did you mean?`
        };
      } else {
        return {
          success: false,
          error: `Person "${assignee}" not found in registry. Available people: ${availablePeople.join(', ')}`
        };
      }
    }

    // Validate assignee is allowed for this project
    if (!isAssigneeAllowedForProject(resolvedPerson.email, resolvedProject)) {
      const allowedAssignees = getAllowedAssigneesForProject(resolvedProject);

      return {
        success: false,
        error: `${resolvedPerson.name} cannot be assigned to tasks in ${resolvedProject.name}. Allowed assignees: ${allowedAssignees.join(', ')}`
      };
    }

    // Apply project context to refine title and notes
    const refinedTitle = refineTitle(resolvedProject, title);
    const synthesizedNotes = synthesizeNotes(resolvedProject, notes, refinedTitle);

    // Format or calculate due date
    const formattedDueDate = formatDueDate(due_on) || getDefaultDueDate(resolvedProject);

    try {
      // Create the task in Asana
      const result = await createTaskWithRetry({
        name: refinedTitle,
        notes: synthesizedNotes,
        assignee: resolvedPerson.email,
        due_on: formattedDueDate,
        projects: [resolvedProject.id]
      });

      // Format success message
      const successMessage = `✅ Created: ${refinedTitle} · Project: ${resolvedProject.name} · Assignee: ${resolvedPerson.name} · Due: ${formattedDueDate} · Link: ${result.permalink}`;

      return {
        success: true,
        message: successMessage,
        taskId: result.gid,
        permalink: result.permalink,
        details: {
          project: resolvedProject.name,
          assignee: resolvedPerson.name,
          title: refinedTitle,
          dueDate: formattedDueDate
        }
      };
    } catch (error) {
      // Handle errors gracefully
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide specific guidance for common errors
        if (errorMessage.includes('ASANA_ACCESS_TOKEN')) {
          errorMessage = 'Asana connection not configured. Please check environment settings.';
        } else if (errorMessage.includes('Rate limit')) {
          errorMessage = 'Asana rate limit reached. Please wait a moment and try again.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMessage = 'Asana authentication failed. Please check access token permissions.';
        } else if (errorMessage.includes('404')) {
          errorMessage = 'Project or workspace not found in Asana. Please verify the project ID.';
        }
      }

      return {
        success: false,
        error: `Failed to create task: ${errorMessage}`
      };
    }
  }
});