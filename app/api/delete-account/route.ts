import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Create authenticated client to verify user
function createRouteHandlerClient() {
  const cookieStore = cookies()

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - happens in middleware
          }
        },
      },
    }
  )
}

// Admin client with service role for user deletion
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient()
    const adminClient = createAdminClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parse request body for confirmation
    const body = await request.json()
    const { confirmation } = body

    // Require exact confirmation phrase
    if (confirmation !== 'ELIMINAR MI CUENTA') {
      return NextResponse.json(
        { error: 'Confirmación incorrecta. Escribe exactamente: ELIMINAR MI CUENTA' },
        { status: 400 }
      )
    }

    // Check if user is a practitioner with active patients
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (practitioner) {
      const { count } = await supabase
        .from('practitioner_patients')
        .select('*', { count: 'exact', head: true })
        .eq('practitioner_id', practitioner.id)
        .eq('status', 'active')

      if (count && count > 0) {
        return NextResponse.json(
          { error: `Tienes ${count} pacientes activos. Debes transferirlos o darlos de baja antes de eliminar tu cuenta.` },
          { status: 400 }
        )
      }
    }

    // Delete storage files (progress photos, plate analysis)
    // These are stored in buckets with user_id in path
    try {
      // List and delete progress photos
      const { data: photoFiles } = await adminClient.storage
        .from('progress-photos')
        .list(user.id)

      if (photoFiles && photoFiles.length > 0) {
        const filePaths = photoFiles.map(f => `${user.id}/${f.name}`)
        await adminClient.storage
          .from('progress-photos')
          .remove(filePaths)
      }

      // List and delete plate analysis photos
      const { data: plateFiles } = await adminClient.storage
        .from('plate-analysis')
        .list(user.id)

      if (plateFiles && plateFiles.length > 0) {
        const filePaths = plateFiles.map(f => `${user.id}/${f.name}`)
        await adminClient.storage
          .from('plate-analysis')
          .remove(filePaths)
      }
    } catch (storageError) {
      // Log but don't fail - storage might not have files
      console.error('Storage cleanup error (non-fatal):', storageError)
    }

    // Delete user from auth (CASCADE will clean up all related data)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar la cuenta. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    })

  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Error interno. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
