<?php

// app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * نقش‌های مجاز را می‌پذیرد.
     *
     * Laravel پارامترهای میان‌افزار را با کاما جدا می‌کند، بنابراین
     * «role:support,observer» دو آرگومان مجزا می‌فرستد و باید variadic باشد.
     *
     * @param  string  ...$roles  یک یا چند نقش مجاز (نمونه: role:support,observer)
     */
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $allowed = [];

        foreach ($roles as $role) {
            $allowed = array_merge($allowed, array_map('trim', explode(',', $role)));
        }

        if (! $request->user() || ! in_array($request->user()->role, $allowed, true)) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        return $next($request);
    }
}
