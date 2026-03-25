import type { User } from './types.js';
import { formatDate } from './format-helpers.js';

export interface UserSummary {
  id: number;
  email: string;
  name: string;
  department: string;
  job_title: string;
  last_login_at: string;
  avatar_url: string;
}

export function summarizeUser(user: User, apiEndpoint?: string): UserSummary {
  const baseUrl = apiEndpoint?.replace(/\/v\d+\/?$/, '') ?? '';

  return {
    id: user.id,
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    department: user.department ?? '',
    job_title: user.job_title ?? '',
    last_login_at: formatDate(user.last_login_at),
    avatar_url: user.avatar?.base_url
      ? `${baseUrl}${user.avatar.base_url}/${user.avatar.file_name}`
      : '',
  };
}
