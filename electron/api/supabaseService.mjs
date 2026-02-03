const supabaseUrl = process.env.VITE_SUPABASE_URL;

/**
 * Core invoker for Supabase Edge Functions from the main process.
 *
 * @param {string} functionName - The name of the Supabase function to call.
 * @param {object} options - The options for the function call.
 * @param {string} options.method - The HTTP method to use.
 * @param {string} options.accessToken - The user's Supabase access token (JWT).
 * @param {object} [options.body] - The request body to send to the function.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function invokeFunction(functionName, { method, accessToken, body }) {
  if (!supabaseUrl) {
    console.error('❌ [SUPABASE] Supabase URL was not provided via SUPABASE_URL env var.');
    return { success: false, error: 'Supabase URL not configured.' };
  }

  if (!accessToken) {
    console.error('❌ [SUPABASE] Access token was not provided.');
    return { success: false, error: 'Access token not provided.' };
  }

  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  try {
    const requestPayload = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    };

    if (body) {
      requestPayload.body = JSON.stringify(body);
    }

    const response = await fetch(functionUrl, requestPayload);

    // Handle responses that might not have a JSON body (e.g., 204 No Content)
    const result = response.status !== 204 ? await response.json() : null;

    if (!response.ok) {
      const errorMessage = result?.error || `Server responded with status ${response.status}`;
      console.error('❌ [SUPABASE] Function call failed:', errorMessage);
      throw new Error(errorMessage);
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('💥 [SUPABASE] Failed to call', functionName, 'function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
  }
}

/**
 * Calls a Supabase function with GET method.
 * @param {string} functionName - The name of the function.
 * @param {object} options - The options for the call.
 * @param {string} options.accessToken - The user's access token.
 */
export function getFunction(functionName, { accessToken }) {
  return invokeFunction(functionName, { method: 'GET', accessToken });
}

/**
 * Calls a Supabase function with POST method.
 * @param {string} functionName - The name of the function.
 * @param {object} options - The options for the call.
 * @param {string} options.accessToken - The user's access token.
 * @param {object} options.body - The request body.
 */
export function postFunction(functionName, { accessToken, body }) {
  return invokeFunction(functionName, { method: 'POST', accessToken, body });
}

/**
 * Calls a Supabase function with PUT method.
 * @param {string} functionName - The name of the function.
 * @param {object} options - The options for the call.
 * @param {string} options.accessToken - The user's access token.
 * @param {object} options.body - The request body.
 */
export function putFunction(functionName, { accessToken, body }) {
  return invokeFunction(functionName, { method: 'PUT', accessToken, body });
}

/**
 * Calls a Supabase function with DELETE method.
 * @param {string} functionName - The name of the function.
 * @param {object} options - The options for the call.
 * @param {string} options.accessToken - The user's access token.
 */
export function deleteFunction(functionName, { accessToken }) {
  return invokeFunction(functionName, { method: 'DELETE', accessToken });
}