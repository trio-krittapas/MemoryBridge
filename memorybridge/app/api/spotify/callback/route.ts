import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/caregiver/playlist?error=' + error, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/caregiver/playlist', req.url));
  }

  // Tokens will be exchanged on the client-side for PKCE
  // Redirect back to playlist with the code in the URL
  return NextResponse.redirect(new URL('/caregiver/playlist?code=' + code, req.url));
}
