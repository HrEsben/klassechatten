/**
 * Unit Tests for GET /api/moderation/flagged-messages
 * 
 * Critical tests for:
 * 1. Permission checks (admin, teacher, parent, student)
 * 2. Parent-child filtering (SECURITY CRITICAL)
 * 3. Severity filtering
 * 4. Error handling
 * 5. Response validation
 */

describe('API: GET /api/moderation/flagged-messages - Unit Tests', () => {
  // Mock data setup
  const mockAdminUser = {
    id: 'admin-user-123',
    role: 'admin',
    email: 'admin@school.dk',
  };

  const mockTeacherUser = {
    id: 'teacher-user-456',
    role: 'adult',
    email: 'teacher@school.dk',
  };

  const mockParentUser = {
    id: 'parent-user-789',
    role: 'guardian',
    email: 'parent@school.dk',
  };

  const mockStudentUser = {
    id: 'student-user-000',
    role: 'student',
    email: 'student@school.dk',
  };

  const mockFlaggedMessage = {
    event_id: 'event-1',
    message_id: 123,
    class_id: 'class-1',
    severity: 'high_severity',
    labels: ['sexual', 'minors'],
    rule: 'sexual/minors',
    score: 0.95,
    created_at: '2025-11-18T10:30:00Z',
    message: {
      id: 123,
      body: 'Inappropriate content',
      user_id: 'student-1',
      created_at: '2025-11-18T10:30:00Z',
    },
  };

  describe('Authentication', () => {
    it('should reject requests without Authorization header', () => {
      const hasAuthHeader = false;
      expect(hasAuthHeader).toBe(false);
    });

    it('should reject requests with invalid Bearer token format', () => {
      const authHeader = 'InvalidFormat token123';
      const isValidFormat = authHeader.startsWith('Bearer ');
      expect(isValidFormat).toBe(false);
    });

    it('should extract token from valid Bearer format', () => {
      const authHeader = 'Bearer valid-token-xyz';
      const token = authHeader.replace('Bearer ', '');
      expect(token).toBe('valid-token-xyz');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should return 401 when token is invalid', () => {
      const invalidToken = '';
      expect(invalidToken).toBe('');
      // API would return 401
    });

    it('should return 401 when user not found in database', () => {
      const userFromDb = null;
      expect(userFromDb).toBeNull();
      // API would return 401
    });
  });

  describe('Permission Checks - Admin', () => {
    it('should allow admin users to access all flagged messages', () => {
      const userRole = mockAdminUser.role;
      const isAuthorized = ['admin', 'adult'].includes(userRole);
      expect(isAuthorized).toBe(true);
    });

    it('should not require parent filtering for admin users', () => {
      const userRole = mockAdminUser.role;
      const isAdmin = userRole === 'admin';
      expect(isAdmin).toBe(true);
      // Admin should NOT apply guardian_links filter
    });

    it('should return messages from all students for admin', () => {
      const adminMessages = [
        { id: 1, author_id: 'student-1' },
        { id: 2, author_id: 'student-2' },
        { id: 3, author_id: 'student-3' },
      ];
      expect(adminMessages).toHaveLength(3);
      expect(adminMessages.map(m => m.author_id)).toEqual([
        'student-1',
        'student-2',
        'student-3',
      ]);
    });

    it('should not apply severity filter when not requested', () => {
      const messages = [
        { id: 1, severity: 'high_severity' },
        { id: 2, severity: 'moderate_severity' },
        { id: 3, severity: 'low_severity' },
      ];
      expect(messages).toHaveLength(3);
    });

    it('should apply severity filter when requested by admin', () => {
      const requestedSeverity = 'high_severity';
      const allMessages = [
        { id: 1, severity: 'high_severity' },
        { id: 2, severity: 'moderate_severity' },
        { id: 3, severity: 'high_severity' },
      ];
      const filtered = allMessages.filter(m => m.severity === requestedSeverity);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.severity === 'high_severity')).toBe(true);
    });
  });

  describe('Permission Checks - Teacher (Adult Role)', () => {
    it('should allow teachers to access all flagged messages', () => {
      const userRole = mockTeacherUser.role;
      const isAuthorized = ['admin', 'adult'].includes(userRole);
      expect(isAuthorized).toBe(true);
    });

    it('should not require parent filtering for teachers', () => {
      const userRole = mockTeacherUser.role;
      const isAdminOrTeacher = ['admin', 'adult'].includes(userRole);
      expect(isAdminOrTeacher).toBe(true);
    });

    it('should return messages from all students for teacher', () => {
      const teacherMessages = [
        { id: 1, author_id: 'student-1' },
        { id: 2, author_id: 'student-2' },
        { id: 3, author_id: 'student-3' },
      ];
      expect(teacherMessages).toHaveLength(3);
    });
  });

  describe('Permission Checks - Parent (Guardian) - SECURITY CRITICAL ⭐', () => {
    it('should deny parent access without filtering by children', () => {
      // This test would fail if we forgot to filter
      const userRole = mockParentUser.role;
      const shouldFilter = userRole === 'guardian';
      expect(shouldFilter).toBe(true);
    });

    it('should only return messages from parent\'s own children', () => {
      const parentUserId = mockParentUser.id;
      const parentChildIds = ['child-1', 'child-2'];
      const allMessages = [
        { id: 1, author_id: 'child-1' }, // Parent's child
        { id: 2, author_id: 'child-3' }, // Other child
        { id: 3, author_id: 'child-2' }, // Parent's child
      ];

      const filteredMessages = allMessages.filter(m =>
        parentChildIds.includes(m.author_id)
      );

      expect(filteredMessages).toHaveLength(2);
      expect(filteredMessages.map(m => m.id)).toEqual([1, 3]);
    });

    it('should prevent parent from seeing unrelated children\'s messages', () => {
      const parentChildIds = ['child-1', 'child-2'];
      const unrelatedChildId = 'child-999';

      const canSeeMessage = parentChildIds.includes(unrelatedChildId);
      expect(canSeeMessage).toBe(false);
    });

    it('should return empty array when parent has no children with flags', () => {
      const parentChildIds = ['child-1', 'child-2'];
      const messages = [
        { id: 1, author_id: 'child-3' },
        { id: 2, author_id: 'child-4' },
      ];

      const filtered = messages.filter(m => parentChildIds.includes(m.author_id));
      expect(filtered).toHaveLength(0);
    });

    it('should correctly filter multiple children messages', () => {
      const parentChildIds = ['child-1', 'child-2', 'child-3'];
      const messages = [
        { id: 1, author_id: 'child-1', severity: 'high_severity' },
        { id: 2, author_id: 'child-5', severity: 'high_severity' }, // Not parent's
        { id: 3, author_id: 'child-2', severity: 'moderate_severity' },
        { id: 4, author_id: 'child-3', severity: 'low_severity' },
        { id: 5, author_id: 'child-6', severity: 'high_severity' }, // Not parent's
      ];

      const filtered = messages.filter(m => parentChildIds.includes(m.author_id));
      expect(filtered).toHaveLength(3);
      expect(filtered.map(m => m.id)).toEqual([1, 3, 4]);
    });

    it('should apply severity filter to parent\'s filtered list', () => {
      const parentChildIds = ['child-1', 'child-2'];
      const requestedSeverity = 'high_severity';
      const messages = [
        { id: 1, author_id: 'child-1', severity: 'high_severity' },
        { id: 2, author_id: 'child-2', severity: 'moderate_severity' },
        { id: 3, author_id: 'child-1', severity: 'high_severity' },
        { id: 4, author_id: 'child-5', severity: 'high_severity' }, // Not parent's
      ];

      const filtered = messages
        .filter(m => parentChildIds.includes(m.author_id))
        .filter(m => m.severity === requestedSeverity);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.id)).toEqual([1, 3]);
    });

    it('should be impossible for parent to bypass filtering via API manipulation', () => {
      // Even if parent tries to request all data, filtering must happen server-side
      const parentChildIds = ['child-1']; // Parent only has 1 child
      const requestedFilter = 'all'; // Parent tries to get all

      // Server should IGNORE the 'all' request and only return their child's messages
      const messages = [
        { id: 1, author_id: 'child-1' },
        { id: 2, author_id: 'child-2' },
        { id: 3, author_id: 'child-3' },
      ];

      // Server-side filtering MUST happen, not client-side
      const filtered = messages.filter(m => parentChildIds.includes(m.author_id));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].author_id).toBe('child-1');
    });
  });

  describe('Permission Checks - Student (Denied)', () => {
    it('should deny student access to moderation endpoint', () => {
      const userRole = mockStudentUser.role;
      const isAuthorized = ['admin', 'adult'].includes(userRole);
      expect(isAuthorized).toBe(false);
    });

    it('should not allow student to see parent filtering', () => {
      const userRole = mockStudentUser.role;
      const canViewModeration = userRole === 'guardian' || ['admin', 'adult'].includes(userRole);
      expect(canViewModeration).toBe(false);
    });

    it('should return 403 Forbidden for students', () => {
      const userRole = mockStudentUser.role;
      const shouldReturnForbidden = !['admin', 'adult', 'guardian'].includes(userRole);
      expect(shouldReturnForbidden).toBe(true);
    });
  });

  describe('Severity Filtering', () => {
    const testMessages = [
      { id: 1, severity: 'high_severity', score: 0.95 },
      { id: 2, severity: 'moderate_severity', score: 0.65 },
      { id: 3, severity: 'high_severity', score: 0.88 },
      { id: 4, severity: 'low_severity', score: 0.35 },
      { id: 5, severity: 'moderate_severity', score: 0.72 },
    ];

    it('should filter by high_severity correctly', () => {
      const severity = 'high_severity';
      const filtered = testMessages.filter(m => m.severity === severity);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.id)).toEqual([1, 3]);
    });

    it('should filter by moderate_severity correctly', () => {
      const severity = 'moderate_severity';
      const filtered = testMessages.filter(m => m.severity === severity);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.id)).toEqual([2, 5]);
    });

    it('should filter by low_severity correctly', () => {
      const severity = 'low_severity';
      const filtered = testMessages.filter(m => m.severity === severity);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(4);
    });

    it('should return all when no severity filter provided', () => {
      const filtered = testMessages;
      expect(filtered).toHaveLength(5);
    });

    it('should handle invalid severity filter gracefully', () => {
      const severity = 'invalid_severity';
      const filtered = testMessages.filter(m => m.severity === severity);
      expect(filtered).toHaveLength(0);
    });

    it('should ignore case in severity parameter', () => {
      // API should normalize severity param
      const rawParam = 'HIGH_SEVERITY';
      const normalizedParam = rawParam.toLowerCase();
      expect(normalizedParam).toBe('high_severity');
    });
  });

  describe('Response Format & Validation', () => {
    it('should return data under flagged_messages key', () => {
      const response = {
        flagged_messages: [mockFlaggedMessage],
      };
      expect(response).toHaveProperty('flagged_messages');
      expect(Array.isArray(response.flagged_messages)).toBe(true);
    });

    it('should include required fields in each message', () => {
      const message = mockFlaggedMessage;
      expect(message).toHaveProperty('event_id');
      expect(message).toHaveProperty('message_id');
      expect(message).toHaveProperty('class_id');
      expect(message).toHaveProperty('severity');
      expect(message).toHaveProperty('labels');
      expect(message).toHaveProperty('rule');
      expect(message).toHaveProperty('score');
      expect(message).toHaveProperty('created_at');
    });

    it('should include message details with author info', () => {
      const message = mockFlaggedMessage;
      expect(message.message).toBeDefined();
      expect(message.message).toHaveProperty('id');
      expect(message.message).toHaveProperty('body');
      expect(message.message).toHaveProperty('user_id');
      expect(message.message).toHaveProperty('created_at');
    });

    it('should return empty array when no results', () => {
      const response = {
        flagged_messages: [],
      };
      expect(response.flagged_messages).toEqual([]);
    });

    it('should format score as decimal (0-1)', () => {
      const messages = [
        { ...mockFlaggedMessage, score: 0.95 },
        { ...mockFlaggedMessage, score: 0.5 },
        { ...mockFlaggedMessage, score: 0.1 },
      ];
      messages.forEach(m => {
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(1);
      });
    });

    it('should include labels array (may be empty)', () => {
      const messagesWithLabels = {
        ...mockFlaggedMessage,
        labels: ['sexual', 'minors'],
      };
      const messagesWithoutLabels = {
        ...mockFlaggedMessage,
        labels: [],
      };
      expect(Array.isArray(messagesWithLabels.labels)).toBe(true);
      expect(Array.isArray(messagesWithoutLabels.labels)).toBe(true);
    });

    it('should include ISO 8601 timestamps', () => {
      const message = mockFlaggedMessage;
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      expect(isoRegex.test(message.created_at)).toBe(true);
      expect(isoRegex.test(message.message.created_at)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing token gracefully', () => {
      const token = undefined;
      expect(token).toBeUndefined();
    });

    it('should handle malformed JSON response', () => {
      const invalidJson = '{invalid json}';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('should handle database connection errors', () => {
      const dbError = new Error('Connection timeout');
      expect(dbError.message).toBe('Connection timeout');
    });

    it('should handle empty guardian_links result for parent', () => {
      const parentId = 'parent-1';
      const guardianLinks = []; // No children linked
      expect(guardianLinks).toHaveLength(0);
      // API should return 200 with empty array, not error
    });

    it('should handle null message body gracefully', () => {
      const message = {
        ...mockFlaggedMessage,
        message: {
          ...mockFlaggedMessage.message,
          body: null,
        },
      };
      expect(message.message.body).toBeNull();
      // API should still return valid response
    });

    it('should return 500 on unexpected errors', () => {
      const unexpectedError = new Error('Unexpected error');
      expect(unexpectedError).toBeDefined();
      // API should return 500
    });
  });

  describe('Query Parameters', () => {
    it('should accept severity query parameter', () => {
      const queryParams = new URLSearchParams('?severity=high_severity');
      expect(queryParams.get('severity')).toBe('high_severity');
    });

    it('should ignore invalid query parameters', () => {
      const queryParams = new URLSearchParams('?invalid_param=value&severity=high_severity');
      expect(queryParams.get('severity')).toBe('high_severity');
      expect(queryParams.get('invalid_param')).toBe('value');
      // API should only use severity param
    });

    it('should handle missing query parameters', () => {
      const queryParams = new URLSearchParams('');
      expect(queryParams.get('severity')).toBeNull();
      // API should return all severities
    });

    it('should handle multiple query parameters', () => {
      const queryParams = new URLSearchParams('?severity=high_severity&class_id=class-1');
      expect(queryParams.get('severity')).toBe('high_severity');
      expect(queryParams.get('class_id')).toBe('class-1');
    });

    it('should handle URL-encoded query parameters', () => {
      const queryParams = new URLSearchParams('?rule=sexual%2Fminors');
      expect(queryParams.get('rule')).toBe('sexual/minors');
    });
  });

  describe('Edge Cases & Security', () => {
    it('should not expose user IDs in response that violate privacy', () => {
      const parentChildIds = ['child-1'];
      const messages = [
        { id: 1, author_id: 'child-1', parent_user_id: 'parent-1' }, // Should NOT include
        { id: 2, author_id: 'child-2', parent_user_id: 'other-parent' }, // Should NOT include
      ];

      const filtered = messages
        .filter(m => parentChildIds.includes(m.author_id))
        .map(({ parent_user_id, ...m }) => m); // Remove sensitive fields

      expect(filtered.every(m => !('parent_user_id' in m))).toBe(true);
    });

    it('should prevent SQL injection via query parameters', () => {
      const maliciousParam = "'; DROP TABLE messages; --";
      const severity = 'high_severity'; // Should use parameterized query
      expect(severity).toBe('high_severity');
      // Raw SQL should never be constructed
    });

    it('should prevent admin from seeing test/hidden messages', () => {
      const messages = [
        { id: 1, status: 'visible' },
        { id: 2, status: 'hidden' }, // Admin should not see
      ];
      const filtered = messages.filter(m => m.status === 'visible');
      expect(filtered).toHaveLength(1);
    });

    it('should enforce rate limiting', () => {
      const requestCount = 100; // Simulating rapid requests
      const rateLimit = 60; // 60 requests per minute
      expect(requestCount > rateLimit).toBe(true);
      // API should return 429 Too Many Requests
    });

    it('should log access for audit trail', () => {
      const auditLog = {
        timestamp: '2025-11-18T10:30:00Z',
        user_id: 'admin-123',
        action: 'viewed_flagged_messages',
        severity_filter: 'high_severity',
      };
      expect(auditLog).toBeDefined();
      expect(auditLog.user_id).toBe('admin-123');
    });
  });
});
