<?php

namespace App\Support;

enum CourseTrack: string
{
    case ArtificialIntelligence = 'ai';
    case Web = 'web';

    public function label(): string
    {
        return match ($this) {
            self::ArtificialIntelligence => 'هوش مصنوعی',
            self::Web => 'وب',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $track): string => $track->value, self::cases());
    }
}
