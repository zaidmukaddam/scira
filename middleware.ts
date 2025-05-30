import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const authRoutes = ["/sign-in", "/sign-up"];

export async function middleware(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: request.headers
    })
    
    const { pathname } = request.nextUrl;
    console.log("Pathname: ", pathname);

    // If user is authenticated but trying to access auth routes
    if (session && authRoutes.some(route => pathname.startsWith(route))) {
        console.log("Redirecting to home");
        return NextResponse.redirect(new URL("/", request.url));
    }
 
    return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};