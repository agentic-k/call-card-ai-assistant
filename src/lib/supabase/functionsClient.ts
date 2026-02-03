// src/lib/supabase/functionsClient.ts
import { supabase } from '@/integrations/supabase/client'
import type { FunctionInvokeOptions } from '@supabase/supabase-js'

/** 
 * Core invoker: just merges your session token into the headers
 * and calls supabase.functions.invoke exactly as in your “working” code.
 */
async function invokeFn<T>(
  name: string,
  opts: FunctionInvokeOptions
): Promise<T> {
  // grab the current user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // merge in the Bearer token
  const merged: FunctionInvokeOptions = {
    ...opts,
    headers: {
      ...opts.headers,
      Authorization: `Bearer ${session?.access_token}`,
    },
  }

  // invoke exactly like your snippet that already works for POST & GET
  const { data, error } = await supabase.functions.invoke(name, merged)

  if (error) throw new Error(`${name} invocation error: ${error.message}`)
  if (data == null) throw new Error(`${name} returned no data`)

  return data as T
}

/** GET (no body) */
export function getFunction<T>(name: string): Promise<T> {
  return invokeFn<T>(name, { method: 'GET' })
}

/** POST (body can be object or string — supabase-js will JSON.stringify for you) */
export function postFunction<T, B = unknown>(
  name: string,
  body: B
): Promise<T> {
  return invokeFn<T>(name, { method: 'POST', body })
}

/** PUT (same as POST) */
export function putFunction<T, B = unknown>(
  name: string,
  body: B
): Promise<T> {
  return invokeFn<T>(name, { method: 'PUT', body })
}

/** PATCH (same as POST) */
export function patchFunction<T, B = unknown>(
  name: string,
  body: B
): Promise<T> {
  return invokeFn<T>(name, { method: 'PATCH', body })
}

/** DELETE (no body) */
export function deleteFunction<T>(name: string): Promise<T> {
  return invokeFn<T>(name, { method: 'DELETE' })
}
