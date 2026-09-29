<?php

namespace App\Support;

enum ConversationStatus: string
{
    case Open = 'open';
    case ClosingPendingRating = 'closing_pending_rating';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'باز',
            self::ClosingPendingRating => 'در انتظار امتیاز',
            self::Closed => 'بسته‌شده',
        };
    }

    public function isTerminal(): bool
    {
        return $this === self::Closed;
    }

    public function acceptsMessages(): bool
    {
        return $this === self::Open;
    }
}
