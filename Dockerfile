# استفاده از ایمیج رسمی PHP 8.5 به همراه FPM (مطابق composer.lock که PHP >= 8.4.1 می‌خواهد)
FROM php:8.5-fpm

# نصب وابستگی‌های سیستم‌عامل
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    libpq-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl pgsql pdo_pgsql zip bcmath gd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# نصب کامپوزر (Composer)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# تعیین مسیر کاری در کانتینر
WORKDIR /var/www

# کپی کردن فایل‌های پروژه به کانتینر
COPY . /var/www

# نصب وابستگی‌های پروژه
RUN composer install --no-interaction --no-dev --optimize-autoloader

# تنظیم دسترسی‌های لازم برای لاراول
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]