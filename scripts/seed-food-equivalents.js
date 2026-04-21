/**
 * Script para insertar los alimentos del SMAE en Supabase
 *
 * Uso:
 *   1. Asegúrate de tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 *   2. Ejecuta: node scripts/seed-food-equivalents.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const foods = require('../lib/smae-foods.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedFoodEquivalents() {
  console.log('=== Seed de Alimentos Equivalentes ===\n');

  // Filtrar solo alimentos con al menos un equivalente
  const validFoods = foods.filter(f =>
    f.verdura || f.fruta || f.carb || f.proteina || f.grasa || f.leguminosa
  );

  console.log(`Total de alimentos a insertar: ${validFoods.length}`);

  // Preparar datos para inserción
  const records = validFoods.map(f => ({
    name: f.name,
    portion: f.portion,
    weight_g: f.weight_g || null,
    category_smae: f.category_smae,
    verdura: f.verdura || 0,
    fruta: f.fruta || 0,
    carb: f.carb || 0,
    proteina: f.proteina || 0,
    grasa: f.grasa || 0,
    leguminosa: f.leguminosa || 0,
  }));

  // Verificar si ya hay datos
  const { count: existingCount } = await supabase
    .from('food_equivalents')
    .select('*', { count: 'exact', head: true });

  if (existingCount > 0) {
    console.log(`\n⚠️  Ya existen ${existingCount} registros en la tabla.`);
    console.log('¿Deseas eliminarlos y re-insertar? (usa --force para hacerlo)');

    if (!process.argv.includes('--force')) {
      console.log('Saliendo sin cambios. Usa --force para sobrescribir.');
      process.exit(0);
    }

    console.log('\nEliminando registros existentes...');
    const { error: deleteError } = await supabase
      .from('food_equivalents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error eliminando:', deleteError);
      process.exit(1);
    }
    console.log('Registros eliminados.');
  }

  // Insertar en lotes de 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  console.log('\nInsertando datos...');

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('food_equivalents')
      .insert(batch);

    if (error) {
      console.error(`Error en lote ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progreso
    const progress = Math.round(((i + batch.length) / records.length) * 100);
    process.stdout.write(`\r  Progreso: ${progress}% (${inserted} insertados)`);
  }

  console.log('\n');
  console.log('=== Resumen ===');
  console.log(`✅ Insertados: ${inserted}`);
  if (errors > 0) console.log(`❌ Errores: ${errors}`);

  // Verificar
  const { count: finalCount } = await supabase
    .from('food_equivalents')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total en BD: ${finalCount}`);
}

seedFoodEquivalents().catch(console.error);
