import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 5000, 15000] // ms

interface NotificationRecord {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  room_id: string | null
  message_id: string | null
  class_id: string | null
  data: any
}

interface PushToken {
  id: string
  user_id: string
  token: string
  platform: string
  provider: string
  is_valid: boolean
}

interface ExpoPushMessage {
  to: string
  sound?: 'default'
  title?: string
  body?: string
  data?: any
  priority?: 'default' | 'normal' | 'high'
  badge?: number
  channelId?: string
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: any
}

serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const payload = await req.json()
    const { type, record } = payload

    // Only handle INSERT events
    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignored non-INSERT event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const notification: NotificationRecord = record

    console.log(`Processing notification ${notification.id} for user ${notification.user_id}`)

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', notification.user_id)
      .eq('is_valid', true)

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError)
      throw tokensError
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No valid push tokens for user ${notification.user_id}`)
      return new Response(
        JSON.stringify({ message: 'No push tokens', notification_id: notification.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${tokens.length} valid push token(s)`)

    // Group tokens by provider
    const expoTokens = tokens.filter((t: PushToken) => t.provider === 'expo')

    const results = []
    let successCount = 0
    let failureCount = 0

    // Send to Expo Push Notification Service
    if (expoTokens.length > 0) {
      const expoResult = await sendExpoNotifications(
        supabase,
        notification,
        expoTokens
      )
      results.push(expoResult)
      successCount += expoResult.success
      failureCount += expoResult.failed
    }

    // Update notification as delivered (if any push was successful)
    if (successCount > 0) {
      await supabase
        .from('notifications')
        .update({
          delivered: true,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', notification.id)
    }

    console.log(`Notification delivery complete: ${successCount} succeeded, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        notification_id: notification.id,
        tokens_processed: tokens.length,
        success: successCount,
        failed: failureCount,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send_notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Send notifications via Expo Push Notification Service
 */
async function sendExpoNotifications(
  supabase: any,
  notification: NotificationRecord,
  tokens: PushToken[]
): Promise<{ provider: string; success: number; failed: number; details: any[] }> {
  console.log(`Sending to ${tokens.length} Expo token(s)`)

  // Prepare Expo push messages
  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token.token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: {
      notification_id: notification.id,
      type: notification.type,
      room_id: notification.room_id,
      message_id: notification.message_id,
      class_id: notification.class_id,
      ...notification.data,
    },
    priority: 'high',
    badge: 1,
    channelId: 'default',
  }))

  let success = 0
  let failed = 0
  const details = []

  // Send in batches of 100 (Expo limit)
  const batchSize = 100
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)
    const batchTokens = tokens.slice(i, i + batchSize)

    const result = await sendExpoBatchWithRetry(batch, 0)

    // Process tickets
    if (result.tickets) {
      for (let j = 0; j < result.tickets.length; j++) {
        const ticket = result.tickets[j]
        const token = batchTokens[j]

        if (ticket.status === 'ok') {
          success++

          // Log delivery
          await supabase.from('notification_delivery_log').insert({
            notification_id: notification.id,
            push_token_id: token.id,
            status: 'sent',
            provider: 'expo',
            provider_response: ticket,
          })

          // Update token last_used_at
          await supabase
            .from('push_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', token.id)
        } else {
          failed++
          console.error(`Expo push failed for token ${token.id}:`, ticket.message)

          // Log failure
          await supabase.from('notification_delivery_log').insert({
            notification_id: notification.id,
            push_token_id: token.id,
            status: 'failed',
            provider: 'expo',
            provider_response: ticket,
            error_code: ticket.details?.error || 'unknown',
            error_message: ticket.message,
          })

          // Handle token errors (invalidate if necessary)
          if (isTokenError(ticket)) {
            await invalidateToken(supabase, token.id, ticket.message || 'Token error')
          } else {
            // Increment error count
            await supabase
              .from('push_tokens')
              .update({
                error_count: token.error_count + 1,
                last_error: ticket.message,
              })
              .eq('id', token.id)
          }
        }

        details.push({
          token_id: token.id,
          status: ticket.status,
          message: ticket.message,
        })
      }
    }
  }

  return { provider: 'expo', success, failed, details }
}

/**
 * Send Expo push notification batch with retry logic
 */
async function sendExpoBatchWithRetry(
  messages: ExpoPushMessage[],
  retryCount: number
): Promise<{ tickets: ExpoPushTicket[] }> {
  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    })

    if (!response.ok) {
      throw new Error(`Expo API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    // Check for data.errors array (API-level errors)
    if (result.errors && result.errors.length > 0) {
      console.error('Expo API errors:', result.errors)
      throw new Error(`Expo API errors: ${JSON.stringify(result.errors)}`)
    }

    return { tickets: result.data || [] }
  } catch (error) {
    console.error(`Expo push attempt ${retryCount + 1} failed:`, error)

    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount]
      console.log(`Retrying in ${delay}ms...`)
      await sleep(delay)
      return sendExpoBatchWithRetry(messages, retryCount + 1)
    }

    // All retries exhausted
    console.error('All retry attempts exhausted')
    return {
      tickets: messages.map(() => ({
        status: 'error' as const,
        message: `Failed after ${MAX_RETRIES} retries: ${error.message}`,
      })),
    }
  }
}

/**
 * Check if error indicates invalid/expired token
 */
function isTokenError(ticket: ExpoPushTicket): boolean {
  if (ticket.status !== 'error') return false

  const errorPatterns = [
    'DeviceNotRegistered',
    'InvalidCredentials',
    'MessageTooBig',
    'MessageRateExceeded',
  ]

  return errorPatterns.some((pattern) =>
    ticket.details?.error?.includes(pattern) || ticket.message?.includes(pattern)
  )
}

/**
 * Mark push token as invalid
 */
async function invalidateToken(supabase: any, tokenId: string, reason: string) {
  console.log(`Invalidating token ${tokenId}: ${reason}`)

  await supabase
    .from('push_tokens')
    .update({
      is_valid: false,
      invalid_at: new Date().toISOString(),
      last_error: reason,
    })
    .eq('id', tokenId)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
