import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // If user is not logged in and not on an auth route or api route, redirect to login
  if (!user && !isAuthRoute && !isApiRoute && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in, restrict access to appropriate layout based on role
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'patient';
    
    const isCaregiverRoute = [
      '/dashboard', '/profile', '/playlist', '/settings'
    ].some(r => request.nextUrl.pathname.startsWith(r));
    
    const isPatientRoute = [
      '/chat', '/exercises', '/music'
    ].some(r => request.nextUrl.pathname.startsWith(r));

    // Redirect logged-in users away from login/landing to their respective homes
    if (isAuthRoute || request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'caregiver' ? '/dashboard' : '/chat';
      return NextResponse.redirect(url);
    }

    // Role-based access control
    if (role === 'caregiver' && isPatientRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (role === 'patient' && isCaregiverRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/chat';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
