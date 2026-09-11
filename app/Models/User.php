<?php 

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
// app/Models/User.php
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'support_type',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSupport(): bool
    {
        return $this->role === 'support';
    }

    public function shifts()
    {
        return $this->hasMany(Shift::class);
    }
    

    // یک متد کمکی برای گرفتن شیفت فعال کاربر
    public function activeShift()
    {
        return $this->hasOne(Shift::class)->where('status', 'active');
    }
    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'support_id');
    }
    public function resources()
    {
        return $this->hasMany(Resource::class, 'created_by');
    }
    public function shiftReports()
    {
        return $this->hasMany(ShiftReport::class);
    }
}
