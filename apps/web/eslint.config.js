import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Global settings for all files
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        
        // TypeScript globals
        NodeJS: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        Event: 'readonly',
        
        // React global (for JSX without explicit import)
        React: 'readonly',
      },
    },
  },

  // TypeScript and React configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      // Next.js rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // Using TypeScript
      'react/no-unescaped-entities': 'warn',
      
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn', 
        { 
          argsIgnorePattern: '^_',           // Ignore function parameters starting with _
          varsIgnorePattern: '^_',           // Ignore variables starting with _
          destructuredArrayIgnorePattern: '^_', // Ignore destructured array elements starting with _
          ignoreRestSiblings: true           // Ignore rest siblings in destructuring
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // General rules
      'no-console': 'off', // Allow console for development
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-undef': 'off', // TypeScript handles this + we have globals
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // TypeScript files only - with project configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      // Additional TypeScript-specific rules can go here
    },
  },

  // Allow <img> in components that handle user uploads, avatars, or dynamic content
  {
    files: [
      '**/components/Avatar.tsx',
      '**/components/ChatRoom.tsx', 
      '**/components/CachedChatRoom.tsx',
      '**/components/*{upload,preview,avatar,modal}*',
    ],
    rules: {
      '@next/next/no-img-element': 'off', // Allow <img> for user-uploaded content
    },
  },

  // Specific overrides for different file types
  {
    files: ['**/*.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      '.turbo/**',
      'dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/out/**',
      '**/.turbo/**',
      '**/dist/**',
    ],
  },
];

export default config;