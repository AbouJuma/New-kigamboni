<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class Unitsseeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Unit::create([
            'name' => 'Kilogram',
            'ShortName' => 'KG',
            'base_unit' => '',
            'operator' => '*',
            'operator_value' => 1,
        ]);

      

    }
    
}
