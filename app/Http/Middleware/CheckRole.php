<?php

// app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * @param  string  $role  یک نقش یا چند نقش جداشده با کاما (نمونه: support,admin)
     */
    public function handle(Request $request, Closure $next, string $role)
    {
        $allowed = array_map('trim', explode(',', $role));

        if (! $request->user() || ! in_array($request->user()->role, $allowed, true)) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        return $next($request);
    }
}
