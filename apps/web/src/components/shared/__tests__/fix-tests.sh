#!/bin/bash

# Fix React import in FormInput.test.tsx
sed -i '' "1s/^/import React from 'react';\n/" FormInput.test.tsx

# Fix ClassCard label test - use correct aria-label
sed -i '' "s/{ name: \/kopier\/i }/{ name: 'Kopiér invite code' }/" ClassCard.test.tsx

# Fix ClassCard accessibility test - use correct aria-label
sed -i '' "285s/.*/      const copyButton = screen.getByRole('button', { name: 'Kopiér invite code' });/" ClassCard.test.tsx

# Fix ClassCard complex scenario - card title is inside card-title h2
sed -i '' "256s/.*/      expect(screen.getByText('De Vilde 5\\'ere')).toBeInTheDocument();/" ClassCard.test.tsx
