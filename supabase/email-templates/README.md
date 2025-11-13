# KlasseChatten Email Templates

Email templates for Supabase authentication with Berlin Edgy design aesthetic.

## Design Features

- **Minimalist & Bold**: Clean, professional design with sharp edges and strong contrast
- **No Emojis**: Professional text-only design with visual hierarchy
- **High Contrast**: Clear readability with #333333 text on white backgrounds
- **Funkyfred Theme Colors**: 
  - Primary: #ff3fa4 (pink accent)
  - Neutral: #6247f5 (purple for special actions)
  - Warning: #ffae00 (yellow for important notices)
  - Error: #ff5449 (red for security warnings)
- **Sharp Design**: No rounded corners, strong borders, geometric layouts
- **Typography**: Uppercase headings, generous letter-spacing, bold hierarchies

## Templates

### 1. confirm-signup.html
**Purpose**: Email verification after user signs up  
**Variables**: `{{ .ConfirmationURL }}`  
**Use Case**: New user registration confirmation

### 2. invite-user.html
**Purpose**: Invite new users to join  
**Variables**: `{{ .ConfirmationURL }}`  
**Use Case**: Admin/teacher inviting users to the platform

### 3. magic-link.html
**Purpose**: Passwordless login via email  
**Variables**: `{{ .ConfirmationURL }}`  
**Use Case**: One-click login without password (expires in 1 hour)

### 4. change-email.html
**Purpose**: Verify new email address when user changes it  
**Variables**: `{{ .ConfirmationURL }}`, `{{ .Email }}`  
**Use Case**: Email address change confirmation

### 5. reset-password.html
**Purpose**: Password reset request  
**Variables**: `{{ .ConfirmationURL }}`  
**Use Case**: User forgot password (expires in 1 hour)

### 6. reauthentication.html
**Purpose**: Reconfirm identity for sensitive actions  
**Variables**: `{{ .ConfirmationURL }}`  
**Use Case**: Security check before critical account changes (expires in 15 minutes)

## How to Upload to Supabase

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]
   - Select: Authentication → Email Templates

2. **For Each Template**:
   - Click on the template type (Confirm signup, Invite user, Magic link, etc.)
   - Copy the content from the corresponding `.html` file
   - Paste into the "Message Body" section
   - Make sure to keep the Supabase variables (e.g., `{{ .ConfirmationURL }}`)
   - Click "Save"

3. **Test Templates**:
   - Create a test user to verify signup email
   - Request password reset to test that flow
   - Try magic link login
   - Test email change functionality

## Template Variables Reference

All templates use Supabase's built-in template variables:

- `{{ .ConfirmationURL }}` - The action link (signup, reset, login, etc.)
- `{{ .Token }}` - Raw token (not typically used in HTML templates)
- `{{ .TokenHash }}` - Hashed token (not typically used in HTML templates)
- `{{ .SiteURL }}` - Your site URL from Supabase config
- `{{ .Email }}` - The user's email address
- `{{ .Data }}` - Custom data (if provided during auth action)
- `{{ .RedirectTo }}` - Custom redirect URL (if provided)

## Customization

### Colors
Current theme colors match the funkyfred theme:
- **Primary Pink**: `#ff3fa4` - Main brand color
- **Neutral Purple**: `#6247f5` - Special actions
- **Warning Yellow**: `#ffae00` - Important notices
- **Error Red**: `#ff5449` - Security alerts
- **Dark Text**: `#333333` - Main content
- **Light Gray**: `#666666` - Secondary text
- **Background**: `#fafafa` - Subtle background sections

### Typography
- **Headings**: 900 weight, uppercase, tight letter-spacing
- **Labels**: 700 weight, uppercase, 2px letter-spacing
- **Body**: 400 weight, 16px, 1.6 line-height
- **Buttons**: 700 weight, uppercase, 1px letter-spacing

### Layout
- **Max Width**: 600px (optimal for email clients)
- **Border**: 2px solid #333333 (sharp, modern)
- **Padding**: 40px on desktop, responsive on mobile
- **Accent Bar**: 80px × 2px brand color indicator

## Mobile Responsive

All templates are mobile-friendly:
- Flexible table layouts for email client compatibility
- Readable font sizes on small screens
- Touch-friendly button sizes (min 44px height)
- Proper viewport meta tags

## Browser/Email Client Support

Tested and optimized for:
- Apple Mail (iOS/macOS)
- Gmail (Web/App)
- Outlook (Web/Desktop)
- Yahoo Mail
- ProtonMail
- Mobile email clients

## Danish Language

All templates are in Danish (da-DK):
- "Bekræft din konto" - Confirm your account
- "Log ind" - Log in
- "Nulstil adgangskode" - Reset password
- "Bekræft identitet" - Confirm identity
