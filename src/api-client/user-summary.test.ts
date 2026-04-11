import { describe, it, expect } from 'vitest';
import { summarizeUser } from './user-summary.js';
import type { User } from './types.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1 as User['id'],
    email: 'test@example.com',
    ...overrides,
  };
}

describe('summarizeUser', () => {
  it('joins first and last name and constructs avatar URL', () => {
    const user = makeUser({
      first_name: 'John',
      last_name: 'Doe',
      avatar: { base_url: '/avatars', file_name: 'photo.png' },
    });

    const result = summarizeUser(user, 'https://api.example.com/v1');

    expect(result.name).toBe('John Doe');
    expect(result.avatar_url).toBe('https://api.example.com/avatars/photo.png');
  });

  it('returns empty avatar_url when user has no avatar', () => {
    const user = makeUser({ first_name: 'Jane', last_name: 'Smith' });

    const result = summarizeUser(user, 'https://api.example.com/v1');

    expect(result.avatar_url).toBe('');
  });

  it('handles missing first_name gracefully', () => {
    const user = makeUser({ last_name: 'Smith' });

    const result = summarizeUser(user);

    expect(result.name).toBe('Smith');
  });

  it('handles missing last_name gracefully', () => {
    const user = makeUser({ first_name: 'Jane' });

    const result = summarizeUser(user);

    expect(result.name).toBe('Jane');
  });

  it('handles missing first_name and last_name gracefully', () => {
    const user = makeUser();

    const result = summarizeUser(user);

    expect(result.name).toBe('');
  });

  it('strips /v1 suffix from endpoint for avatar URL', () => {
    const user = makeUser({
      avatar: { base_url: '/avatars', file_name: 'pic.jpg' },
    });

    const result = summarizeUser(user, 'https://api.example.com/v1');

    expect(result.avatar_url).toBe('https://api.example.com/avatars/pic.jpg');
  });

  it('strips /v1/ suffix with trailing slash from endpoint', () => {
    const user = makeUser({
      avatar: { base_url: '/avatars', file_name: 'pic.jpg' },
    });

    const result = summarizeUser(user, 'https://api.example.com/v1/');

    expect(result.avatar_url).toBe('https://api.example.com/avatars/pic.jpg');
  });

  it('works when endpoint has no /v1 suffix', () => {
    const user = makeUser({
      avatar: { base_url: '/avatars', file_name: 'pic.jpg' },
    });

    const result = summarizeUser(user, 'https://api.example.com');

    expect(result.avatar_url).toBe('https://api.example.com/avatars/pic.jpg');
  });

  it('uses relative path when no endpoint provided', () => {
    const user = makeUser({
      avatar: { base_url: '/avatars', file_name: 'pic.jpg' },
    });

    const result = summarizeUser(user);

    expect(result.avatar_url).toBe('/avatars/pic.jpg');
  });
});
