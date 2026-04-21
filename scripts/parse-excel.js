/**
 * Script para parsear el Excel de equivalentes SMAE
 * Mapeo según indicaciones del usuario:
 * - Leguminosa = carb
 * - Solo AOA Alto en Grasa cuenta como proteina + grasa
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Mapeo de categorías del Excel a nuestro sistema
const CATEGORY_MAPPING = {
  'Verduras': { verdura: 1 },
  'Frutas': { fruta: 1 },
  'Cereales S/G': { carb: 1 },
  'Cereales C/G': { carb: 1, grasa: 1 },
  'Leguminosas': { carb: 1 },  // Usuario: leguminosa = carb
  'AOA MBAG': { proteina: 1 },  // Muy Bajo Aporte Grasa
  'AOA BAG': { proteina: 1 },   // Bajo Aporte Grasa
  'AOA MAG': { proteina: 1 },   // Moderado Aporte Grasa (sin grasa según usuario)
  'AOA AAG': { proteina: 1, grasa: 1 },  // Alto Aporte Grasa (único con grasa)
  'Leche descremada': { proteina: 1 },
  'Leche semidescremada': { proteina: 1, grasa: 0.5 },
  'Leche entera': { proteina: 1, grasa: 1 },
  'Leche con azúcar': { proteina: 1, grasa: 1, carb: 1 },
  'Grasas sin proteínas': { grasa: 1 },
  'Grasas con proteínas': { grasa: 1, proteina: 1 },
  'Azucares sin grasa': { carb: 1 },
  'Azucares con grasa': { carb: 1, grasa: 1 },
  'Alcohol': { carb: 1 },
  'Libres en energía': {},  // Sin equivalentes
};

// Leer Excel
const filePath = path.join(__dirname, '../public/equivalentes.xlsm');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Hoja1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Headers en fila 1 (índice 1)
// [ID, seleccione categoria, Alimento, Cantidad sugerida, Unidad, Peso bruto, Peso neto, Energía]

const foods = [];
const skipped = { noCategory: 0, noEquivalents: 0 };

// Procesar desde fila 2 (índice 2)
for (let i = 2; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[2]) continue;  // Sin nombre de alimento

  const category = row[1];
  const name = String(row[2]).trim();
  const quantity = row[3];
  const unit = row[4];
  const weightBruto = row[5];
  const weightNeto = row[6];

  // Verificar categoría
  if (!category || !CATEGORY_MAPPING[category]) {
    skipped.noCategory++;
    continue;
  }

  const equivalents = CATEGORY_MAPPING[category];

  // Saltar si no tiene equivalentes (Libres en energía)
  if (Object.keys(equivalents).length === 0) {
    skipped.noEquivalents++;
    continue;
  }

  // Formar porción
  let portion = '';
  if (quantity && unit) {
    // Formatear cantidad (convertir decimales a fracciones comunes)
    let qtyStr = String(quantity);
    if (quantity === 0.5) qtyStr = '1/2';
    else if (quantity === 0.25) qtyStr = '1/4';
    else if (quantity === 0.33 || quantity === 0.333) qtyStr = '1/3';
    else if (quantity === 0.75) qtyStr = '3/4';
    else if (quantity === 1.5) qtyStr = '1 1/2';

    portion = `${qtyStr} ${unit}`;
  }

  foods.push({
    name,
    portion,
    weight_g: weightNeto || weightBruto || null,
    category_smae: category,
    verdura: equivalents.verdura || 0,
    fruta: equivalents.fruta || 0,
    carb: equivalents.carb || 0,
    proteina: equivalents.proteina || 0,
    grasa: equivalents.grasa || 0,
    leguminosa: 0,  // Ya no usamos leguminosa separada
  });
}

// Estadísticas
console.log('=== Parsing completado ===\n');
console.log(`Total procesados: ${foods.length}`);
console.log(`Saltados (sin categoría): ${skipped.noCategory}`);
console.log(`Saltados (libres en energía): ${skipped.noEquivalents}`);

console.log('\n=== Por categoría ===');
const byCat = {};
foods.forEach(f => {
  if (!byCat[f.category_smae]) byCat[f.category_smae] = 0;
  byCat[f.category_smae]++;
});
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  const eq = CATEGORY_MAPPING[cat];
  const eqStr = Object.entries(eq).map(([k, v]) => `${k}:${v}`).join(', ');
  console.log(`  ${cat}: ${count} → ${eqStr}`);
});

console.log('\n=== Por tipo de equivalente ===');
const byEquiv = { verdura: 0, fruta: 0, carb: 0, proteina: 0, grasa: 0 };
foods.forEach(f => {
  if (f.verdura) byEquiv.verdura++;
  if (f.fruta) byEquiv.fruta++;
  if (f.carb) byEquiv.carb++;
  if (f.proteina) byEquiv.proteina++;
  if (f.grasa) byEquiv.grasa++;
});
Object.entries(byEquiv).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Guardar JSON
const outputPath = path.join(__dirname, '../lib/smae-foods.json');
fs.writeFileSync(outputPath, JSON.stringify(foods, null, 2));
console.log(`\n✅ Guardado en: ${outputPath}`);

// Muestra
console.log('\n=== Muestra de alimentos ===');
foods.slice(0, 5).forEach(f => {
  console.log(`  ${f.name} (${f.portion}) [${f.category_smae}]`);
});
