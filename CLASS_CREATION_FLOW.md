# Class Creation & Student Onboarding Flow

## Overview
This implementation allows parents to create classes with placeholder student accounts, which students can then claim using an invitation code.

## Flow Diagram

### Parent Flow
```
1. Parent signs up/logs in
   ↓
2. Redirected to /onboarding
   ↓
3. Choice: "Create Class" or "Join Class"
   ↓
4. If Create Class:
   - Enter school name
   - Select grade (0-9) and letter (A-H)
   - Optional nickname (e.g., "De Seje")
   - Enter number of students (1-50)
   ↓
5. System creates:
   - School (if not exists)
   - Class with unique 8-char invite code
   - Default "general" chat room
   - N placeholder student profiles named "Klassekammerat 1", "Klassekammerat 2", etc.
   - Parent added as guardian in class_members
   ↓
6. Parent receives invite code to share with students
```

### Student Flow
```
1. Student visits /student-signup
   ↓
2. Enter 8-character invite code
   ↓
3. System verifies:
   - Code exists
   - Class has unclaimed placeholder slots
   ↓
4. Student enters:
   - Full name
   - Email
   - Password
   ↓
5. System:
   - Creates auth account
   - Finds unclaimed placeholder in class
   - Updates placeholder display_name
   - Transfers class membership to new user
   - Deletes placeholder auth user
   ↓
6. Student logged in and added to class
```

## Database Schema Changes

### New Columns in `profiles`
- `is_placeholder` (boolean): Marks profiles created as placeholders
- `claimed_at` (timestamptz): When a placeholder was claimed by a real student

### New Column in `classes`
- `nickname` (text): Optional friendly class name

## Key Functions

### `create_class_with_students()`
**Location:** `/supabase/migrations/20241113_class_creation_flow.sql`

**Purpose:** Creates a complete class setup in one transaction

**Parameters:**
- `p_school_name`: School name (string)
- `p_grade_level`: Grade 0-9 (int)
- `p_class_letter`: Letter A-H (string)
- `p_nickname`: Optional class nickname (string)
- `p_student_count`: Number of placeholder students (int)
- `p_creator_id`: Parent's user ID (uuid)

**Returns:** JSON with class_id, invite_code, label, nickname, student_count

**What it does:**
1. Creates/finds school
2. Generates unique 8-char invite code
3. Creates class record
4. Creates default "general" room
5. Adds parent as guardian member
6. Creates N placeholder students:
   - Temporary auth users with random email
   - Profile with `is_placeholder=true`
   - Named "Klassekammerat 1", etc.
   - Added to class_members as 'child'

### `claim_placeholder_student()`
**Location:** `/supabase/migrations/20241113_class_creation_flow.sql`

**Purpose:** Links a new student account to an unclaimed placeholder

**Parameters:**
- `p_class_invite_code`: 8-char invite code
- `p_student_name`: Student's real name
- `p_new_user_id`: New auth user ID

**Returns:** JSON with class_id and claimed=true

**What it does:**
1. Finds class by invite code
2. Finds first unclaimed placeholder
3. Updates placeholder profile with real name and claimed_at
4. Transfers class membership to new user
5. Deletes placeholder auth user

## API Routes

### POST `/api/classes/create`
**Purpose:** Create new class with placeholder students

**Body:**
```json
{
  "schoolName": "Sønderskov Skole",
  "gradeLevel": 3,
  "classLetter": "A",
  "nickname": "De Seje",
  "studentCount": 20
}
```

**Auth:** Requires logged-in user with role 'guardian' or 'adult'

**Returns:**
```json
{
  "success": true,
  "class": {
    "class_id": "uuid",
    "invite_code": "ABC123XY",
    "label": "3A",
    "nickname": "De Seje",
    "student_count": 20
  }
}
```

### POST `/api/classes/join`
**Purpose:** Join existing class with invite code

**Body:**
```json
{
  "inviteCode": "ABC123XY"
}
```

**Auth:** Requires logged-in user

**Returns:**
```json
{
  "success": true,
  "class": {
    "id": "uuid",
    "label": "3A",
    "nickname": "De Seje",
    "school": { "name": "Sønderskov Skole" }
  }
}
```

## UI Pages

### `/onboarding` (Parent)
**Components:**
- Choice cards: "Create Class" or "Join Class"
- Create form: School, grade, letter, nickname, student count
- Join form: Invite code input

**Features:**
- Input validation
- Error handling
- Loading states
- Responsive design with Berlin Edgy aesthetic

### `/student-signup` (Student)
**Components:**
- Step 1: Invite code verification
- Step 2: Student account creation

**Features:**
- Verifies invite code before showing signup form
- Checks for available placeholder slots
- Shows class info after code verification
- Creates account and claims placeholder in one flow

## Security Considerations

### Row Level Security (RLS)
- Placeholders visible to class members
- Only authenticated users can create/join classes
- Only guardians/adults can create classes
- Service role used for placeholder operations (bypass RLS)

### Validation
- Grade level: 0-9
- Class letter: A-H
- Student count: 1-50
- Invite code: 8 uppercase alphanumeric (no confusing chars)
- Email/password validation via Supabase auth

## Testing Checklist

### Parent Flow
- [ ] Parent signs up → Goes to /onboarding
- [ ] Parent logs in without classes → Goes to /onboarding
- [ ] Parent logs in with classes → Goes to dashboard
- [ ] Create class form validates inputs
- [ ] Class created with correct placeholder count
- [ ] Invite code is generated and unique
- [ ] Parent added as class member
- [ ] Default room created

### Student Flow
- [ ] Invalid invite code shows error
- [ ] Valid invite code shows class info
- [ ] Full class (no placeholders) shows error
- [ ] Student account creation works
- [ ] Placeholder claimed correctly
- [ ] Student added to class
- [ ] Old placeholder auth user deleted
- [ ] Student can log in and see class

### Edge Cases
- [ ] Duplicate school names handled
- [ ] Duplicate invite codes prevented
- [ ] Multiple students claiming simultaneously
- [ ] Parent with admin role can create classes
- [ ] Child role cannot create classes

## Future Enhancements

1. **Invite Code Display**
   - Show invite code prominently after class creation
   - Add copy-to-clipboard button
   - Email/share functionality

2. **Placeholder Management**
   - View unclaimed placeholders
   - Add more student slots
   - Remove unclaimed placeholders
   - Rename placeholders before claiming

3. **Class Management**
   - Edit class details
   - Transfer ownership
   - Archive/delete class
   - Regenerate invite code

4. **Student Invitations**
   - Send email invitations
   - Generate QR codes
   - Printable invitation cards

5. **Analytics**
   - Track signup completion rate
   - See which placeholders are unclaimed
   - Monitor class activity

## Migration Files

- `20241113_class_creation_flow.sql` - Main migration with:
  - Schema changes
  - Function definitions
  - RLS policies
  - Permissions grants
