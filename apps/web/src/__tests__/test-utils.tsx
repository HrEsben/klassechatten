import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() =>
      Promise.resolve({
        data: {
          session: {
            access_token: 'mock-token',
            user: {
              id: 'mock-user-id',
            },
          },
        },
      })
    ),
  },
  channel: jest.fn(() => ({
    on: jest.fn(function() {
      return this;
    }),
    subscribe: jest.fn(),
  })),
  removeChannel: jest.fn(),
};

// Create a wrapper with necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render, mockSupabaseClient };
