<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Setting;
use Carbon\Carbon;

class CheckLicenseExpiration
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip license check for login, setup, license, and public routes
        $excludedRoutes = ['login', 'setup', 'password', 'api/login', 'license'];
        
        foreach ($excludedRoutes as $route) {
            if ($request->is($route) || $request->is($route . '/*')) {
                return $next($request);
            }
        }

        // Get the first settings record (assuming there's only one)
        $setting = Setting::first();
        
        if ($setting && $setting->license_expires_at) {
            $today = Carbon::today();
            $expiryDate = Carbon::parse($setting->license_expires_at);
            
            // Check if license has expired
            if ($today->greaterThan($expiryDate)) {
                // If user is trying to access protected routes, redirect to login with message
                if ($request->ajax() || $request->wantsJson()) {
                    return response()->json([
                        'message' => 'Your license has expired. Please contact support for renewal.',
                        'license_expired' => true,
                        'redirect' => '/login'
                    ], 403);
                }
                
                // Logout the user if they're authenticated
                if (auth()->check()) {
                    auth()->logout();
                }
                
                // Store flash message for the login page
                session()->flash('license_expired', 'Your license has expired. Please contact support for renewal.');
                
                return redirect('/login');
            }
        }

        return $next($request);
    }
}
