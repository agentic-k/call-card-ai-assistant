import { postFunction } from './supabaseService.mjs';

/**
 * Handles setting up the Google Calendar integration.
 * This function is invoked from the renderer process to securely store
 * the Google refresh token and set up a watch request by calling a 
 * Supabase Edge Function.
 */
export async function setupGoogleCalendar(event, { refreshToken, accessToken, supabaseAccessToken, expiresIn, userId }) {

  console.debug('🔍 [MAIN] setupGoogleCalendar called');

  // Validate required parameters
  if (!accessToken) {
    console.error('❌ [MAIN] Missing accessToken');
    return { success: false, error: 'Missing accessToken parameter' };
  }
  if (!supabaseAccessToken) {
    console.error('❌ [MAIN] Missing supabaseAccessToken');
    return { success: false, error: 'Missing supabaseAccessToken parameter' };
  }
  if (!userId) {
    console.error('❌ [MAIN] Missing userId');
    return { success: false, error: 'Missing userId parameter' };
  }
  if (expiresIn === null || expiresIn === undefined) {
    console.error('❌ [MAIN] Missing expiresIn');
    return { success: false, error: 'Missing expiresIn parameter' };
  }

  try {
    const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const body = { 
      userId,
      googleAccessToken: accessToken,
      accessTokenExpiresAt,
    };

    if (refreshToken) {
      body.googleRefreshToken = refreshToken;
    }

    const result = await postFunction('google-calendar-setup-handler', {
      accessToken: supabaseAccessToken,
      body,
    });

    return result;
  } catch (error) {
    console.error('❌ [MAIN] Error in setupGoogleCalendar:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error in main process' 
    };
  }
} 