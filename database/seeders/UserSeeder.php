<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Example users
        $users = [
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@gmail.com',
                'password' => Hash::make('12345678'), // Always hash passwords
                'role_id' => 1, // superadmin
                'report_notification' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => 'admin@gmail.com',
                'password' => Hash::make('12345678'),
                'role_id' => 2, // admin
                'report_notification' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'first_name' => 'SubAdmin',
                'last_name' => 'User',
                'email' => 'subadmin@gmail.com',
                'password' => Hash::make('12345678'),
                'role_id' => 3, // admin
                'report_notification' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'first_name' => 'Counsellor',
                'last_name' => 'User',
                'email' => 'counsellor@gmail.com',
                'password' => Hash::make('12345678'),
                'role_id' => 4, // admin
                'report_notification' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('users')->insert($users);
    }
}
