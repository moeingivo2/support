<?php

namespace App\Support;

enum MessageType: string
{
    case Text = 'text';
    case Code = 'code';
    case Image = 'image';
    case File = 'file';
    case Voice = 'voice';

    public function requiresAttachment(): bool
    {
        return in_array($this, [self::Image, self::File, self::Voice], true);
    }

    public function allowsBody(): bool
    {
        return in_array($this, [self::Text, self::Code, self::File], true);
    }
}
