<?php

namespace App\Support;

use RuntimeException;

class UnsupportedAttachmentException extends RuntimeException
{
    public function __construct(string $message = 'این نوع فایل مجاز به آپلود نیست')
    {
        parent::__construct($message);
    }
}
