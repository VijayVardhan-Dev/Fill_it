import type { Persona } from './types';

/**
 * Sprint 1 data is deliberately local and fictional. Swap this module for a
 * storage-backed profile source in a later sprint; no network is used here.
 */
export const mockPersonas: Persona[] = [
  {
    id: 'developer',
    name: 'Dev',
    headline: 'Software engineer',
    profile: {
      fullName: 'Vijay Vardhan',
      firstName: 'Vijay',
      lastName: 'Vardhan',
      email: 'vijay@example.com',
      phone: '+91 98765 43210',
      phoneE164: '+919876543210',
      phoneNational: '9876543210',
      city: 'Bhimavaram',
      state: 'Andhra Pradesh',
      country: 'India',
      streetAddress: '12 Demo Street',
      company: 'Northstar Labs',
      jobTitle: 'Software Engineer',
      website: 'https://example.dev',
      github: 'https://github.com/example-dev',
      linkedin: 'https://www.linkedin.com/in/example-dev',
      portfolio: 'https://portfolio.example.dev',
      degree: 'B.Tech in Computer Science',
      school: 'Demo Institute of Technology',
      cgpa: '8.6',
      graduationDate: '2024-06-15',
      startDate: '2022-08-01',
      dateOfBirth: '2002-03-14',
      yearsExperience: '3',
      bio: 'Software engineer focused on accessible web applications.',
    },
  },
  {
    id: 'founder',
    name: 'Founder',
    headline: 'Product founder',
    profile: {
      fullName: 'Aarav Mehta',
      firstName: 'Aarav',
      lastName: 'Mehta',
      email: 'aarav@example.com',
      phone: '+91 91234 56780',
      phoneE164: '+919123456780',
      phoneNational: '9123456780',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      streetAddress: '48 Demo Avenue',
      company: 'Brightpath Studio',
      jobTitle: 'Founder',
      website: 'https://brightpath.example',
      github: 'https://github.com/brightpath-demo',
      linkedin: 'https://www.linkedin.com/in/aarav-demo',
      portfolio: 'https://brightpath.example/about',
      degree: 'B.A. in Economics',
      school: 'Demo University',
      cgpa: '9.1',
      graduationDate: '2021-05-20',
      startDate: '2023-01-10',
      dateOfBirth: '1998-11-02',
      yearsExperience: '7',
      bio: 'Founder building thoughtful tools for growing teams.',
    },
  },
];

export function getPersona(id: Persona['id']): Persona {
  return mockPersonas.find((persona) => persona.id === id) ?? mockPersonas[0]!;
}
