<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RolesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'superadmin', 'guard_name' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'admin', 'guard_name' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'subadmin', 'guard_name' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'counsellor', 'guard_name' => null, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'user', 'guard_name' => null, 'created_at' => now(), 'updated_at' => now()],
        ];

        DB::table('roles')->insert($roles);
    }
}
