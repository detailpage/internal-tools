import { NextResponse } from 'next/server'

export async function GET() {
  // Return diagnostic information about the environment
  const diagnostics = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    // Check for any NEXT_PUBLIC variables
    nextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key]
        return acc
      }, {} as Record<string, string | undefined>),
    // Check if BC credentials are present (but don't expose values)
    hasClientId: !!process.env.BC_CLIENT_ID,
    hasClientSecret: !!process.env.BC_CLIENT_SECRET,
    // Show all environment variable names (not values for security)
    allEnvVarNames: Object.keys(process.env).sort()
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  })
}
