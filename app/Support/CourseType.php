<?php

namespace App\Support;

enum CourseType: string
{
    case Offline = 'offline';
    case InPerson = 'in_person';
    case School = 'school';

    public function label(): string
    {
        return match ($this) {
            self::Offline => 'آفلاین',
            self::InPerson => 'حضوری',
            self::School => 'مدرسه',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $type): string => $type->value, self::cases());
    }
}
