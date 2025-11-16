-- ============================================================
-- MIGRATION: In-App Parent Notifications for Flagged Messages
-- ============================================================
-- Replaces email-based system with in-app notifications
-- Creates notifications directly in the notifications table
-- when messages are flagged by moderation

-- ============================================================
-- STEP 1: Update process_parent_notifications to create in-app notifications
-- ============================================================

CREATE OR REPLACE FUNCTION process_parent_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notifications_created INTEGER := 0;
  v_queue_record RECORD;
  v_guardian RECORD;
  v_flagged_count INTEGER;
  v_notification_title TEXT;
  v_notification_body TEXT;
  v_child_name TEXT;
  v_room_name TEXT;
  v_class_name TEXT;
  v_flagged_messages JSONB;
  v_context_messages JSONB;
  v_severity TEXT;
BEGIN
  -- Process all pending notifications that are ready (30 seconds after creation for batching)
  FOR v_queue_record IN
    SELECT * FROM parent_notification_queue
    WHERE status = 'pending'
      AND created_at <= (NOW() - INTERVAL '30 seconds')
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    -- Get child name
    SELECT COALESCE(p.display_name, u.email, 'Dit barn')
    INTO v_child_name
    FROM profiles p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE p.user_id = v_queue_record.child_user_id;

    -- Get room and class names
    SELECT r.name, c.label
    INTO v_room_name, v_class_name
    FROM rooms r
    LEFT JOIN classes c ON c.id = r.class_id
    WHERE r.id = v_queue_record.room_id;

    -- Count flagged messages
    v_flagged_count := array_length(v_queue_record.flagged_message_ids, 1);

    -- Build flagged messages JSON
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'body', m.body,
        'image_url', m.image_url,
        'created_at', m.created_at
      )
    )
    INTO v_flagged_messages
    FROM messages m
    WHERE m.id = ANY(v_queue_record.flagged_message_ids);

    -- Build context messages JSON with user names
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'body', m.body,
        'image_url', m.image_url,
        'created_at', m.created_at,
        'user_name', COALESCE(p.display_name, u.email)
      ) ORDER BY m.created_at DESC
    )
    INTO v_context_messages
    FROM messages m
    LEFT JOIN profiles p ON m.user_id = p.user_id
    LEFT JOIN auth.users u ON m.user_id = u.id
    WHERE m.id = ANY(v_queue_record.context_message_ids);

    -- Get severity
    v_severity := COALESCE(v_queue_record.severity, 'moderate_severity');

    -- Build notification text
    IF v_flagged_count > 1 THEN
      v_notification_title := v_child_name || ' - ' || v_flagged_count || ' beskeder markeret';
      v_notification_body := v_flagged_count || ' beskeder fra ' || v_child_name || ' i ' || COALESCE(v_room_name, 'chatten') || ' blev markeret som potentielt upassende';
    ELSE
      v_notification_title := v_child_name || ' - Besked markeret';
      v_notification_body := 'En besked fra ' || v_child_name || ' i ' || COALESCE(v_room_name, 'chatten') || ' blev markeret som potentielt upassende';
    END IF;

    -- Create notification for each guardian
    FOR v_guardian IN
      SELECT gl.guardian_user_id
      FROM guardian_links gl
      WHERE gl.child_user_id = v_queue_record.child_user_id
        AND gl.consent_status = 'granted'
    LOOP
      -- Insert notification
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        room_id,
        message_id,
        class_id,
        data,
        idempotency_key
      ) VALUES (
        v_guardian.guardian_user_id,
        'moderation',
        v_notification_title,
        v_notification_body,
        v_queue_record.room_id,
        v_queue_record.flagged_message_ids[1], -- First flagged message as reference
        v_queue_record.class_id,
        jsonb_build_object(
          'child_user_id', v_queue_record.child_user_id,
          'child_display_name', v_child_name,
          'flagged_messages', v_flagged_messages,
          'context_messages', v_context_messages,
          'flagged_count', v_flagged_count,
          'severity', v_severity,
          'room_name', v_room_name,
          'class_name', v_class_name
        ),
        'parent_flagged_' || v_queue_record.id || '_' || v_guardian.guardian_user_id
      )
      ON CONFLICT (idempotency_key) DO NOTHING; -- Prevent duplicates
      
      v_notifications_created := v_notifications_created + 1;
    END LOOP;

    -- Mark queue item as sent
    UPDATE parent_notification_queue
    SET 
      status = 'sent',
      sent_at = NOW()
    WHERE id = v_queue_record.id;
  END LOOP;

  RETURN v_notifications_created;
END;
$$;

-- ============================================================
-- STEP 2: Update permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION process_parent_notifications TO service_role;

-- ============================================================
-- STEP 3: Create a scheduled job trigger (optional - can also be called via Edge Function)
-- ============================================================

-- Note: This requires pg_cron extension
-- Uncomment the following if you want automatic processing every minute:

/*
SELECT cron.schedule(
  'process-parent-notifications',
  '* * * * *', -- Every minute
  $$SELECT process_parent_notifications();$$
);
*/

-- ============================================================
-- DONE
-- ============================================================

-- Summary:
-- ✅ Replaced email-based notification system with in-app notifications
-- ✅ Notifications are created directly in the notifications table
-- ✅ Batching still works (30-second delay for grouping)
-- ✅ Context includes flagged messages + 8 previous messages
-- ✅ Guardians receive notifications via existing notification system
-- ✅ Idempotency prevents duplicate notifications

-- To manually trigger processing:
-- SELECT process_parent_notifications();

-- To view pending notifications:
-- SELECT * FROM parent_notification_queue WHERE status = 'pending';

-- To view created notifications:
-- SELECT * FROM notifications WHERE type = 'moderation' ORDER BY created_at DESC;
