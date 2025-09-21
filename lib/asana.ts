/**
 * Minimal Asana API client for task creation
 * Phase 1: Create single tasks with basic fields
 */

interface AsanaTask {
  name: string;
  notes?: string;
  assignee: string; // email or GID
  due_on?: string; // YYYY-MM-DD format
  projects: string[]; // array of project GIDs
}

interface AsanaTaskResponse {
  data: {
    gid: string;
    name: string;
    notes?: string;
    assignee?: {
      gid: string;
      name?: string;
      email?: string;
    };
    permalink_url?: string;
  };
}

export class AsanaAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AsanaAPIError';
  }
}

/**
 * Create a task in Asana
 */
export async function createAsanaTask(task: AsanaTask): Promise<string> {
  const token = process.env.ASANA_ACCESS_TOKEN;

  if (!token) {
    throw new AsanaAPIError('ASANA_ACCESS_TOKEN not configured');
  }

  const response = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: task
    })
  });

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? '1');
    throw new AsanaAPIError(
      'Rate limit exceeded',
      429,
      retryAfter
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new AsanaAPIError(
      `Asana API error ${response.status}: ${errorText}`,
      response.status
    );
  }

  const json = await response.json() as AsanaTaskResponse;
  const taskGid = json?.data?.gid;

  if (!taskGid) {
    throw new AsanaAPIError('No task GID returned from Asana');
  }

  return taskGid;
}

/**
 * Get task permalink and details
 */
export async function getTaskPermalink(taskGid: string): Promise<{
  permalink: string;
  assigneeName?: string;
  assigneeEmail?: string;
}> {
  const token = process.env.ASANA_ACCESS_TOKEN;

  if (!token) {
    throw new AsanaAPIError('ASANA_ACCESS_TOKEN not configured');
  }

  const response = await fetch(
    `https://app.asana.com/api/1.0/tasks/${taskGid}?opt_fields=permalink_url,assignee.name,assignee.email`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new AsanaAPIError(
      `Failed to get task details ${response.status}: ${errorText}`,
      response.status
    );
  }

  const json = await response.json() as AsanaTaskResponse;

  if (!json?.data?.permalink_url) {
    throw new AsanaAPIError('No permalink returned from Asana');
  }

  return {
    permalink: json.data.permalink_url,
    assigneeName: json.data.assignee?.name,
    assigneeEmail: json.data.assignee?.email,
  };
}

/**
 * Create a task with retry logic for rate limits
 */
export async function createTaskWithRetry(
  task: AsanaTask,
  maxRetries = 2
): Promise<{ gid: string; permalink: string; assigneeName?: string }> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Create the task
      const taskGid = await createAsanaTask(task);

      // Get the permalink
      const { permalink, assigneeName, assigneeEmail } = await getTaskPermalink(taskGid);

      return {
        gid: taskGid,
        permalink,
        assigneeName: assigneeName || assigneeEmail
      };
    } catch (error) {
      if (error instanceof AsanaAPIError && error.status === 429 && retries < maxRetries - 1) {
        // Wait and retry on rate limit
        const waitTime = (error.retryAfter || 1) + 0.5; // Add 0.5s buffer
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new AsanaAPIError('Max retries exceeded');
}