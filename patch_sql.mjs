import fs from 'fs';
const file = 'src/components/features/SetupDatabase/sql-scripts.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `            SUM(CASE WHEN LOWER(sp.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(sp.brand_name) = 'vivan' AND LOWER(sp.category) IN ('vivan lcd team', 'vivan sparepart')) AND NOT (LOWER(sp.brand_name) = 'xpas' AND LOWER(sp.category) IN ('xpas sparepart', 'xpas lcd 事业部')) THEN sp.total_amount ELSE 0 END) as total_payment_3c,`;
const replacement1 = `            SUM(CASE WHEN LOWER(sp.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(sp.brand_name) = 'vivan' AND LOWER(sp.category) IN ('vivan lcd team', 'vivan sparepart', 'screen assembly')) THEN sp.total_amount ELSE 0 END) as total_payment_3c,`;

const target2 = `            SUM(CASE WHEN LOWER(s.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') THEN s.total_amount ELSE 0 END) as omset_3c,`;
const replacement2 = `            SUM(CASE WHEN LOWER(s.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') AND NOT (LOWER(s.brand_name) = 'vivan' AND LOWER(s.category) IN ('vivan lcd team', 'vivan sparepart', 'screen assembly')) THEN s.total_amount ELSE 0 END) as omset_3c,`;

const target3 = `            COUNT(DISTINCT CASE WHEN LOWER(s.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') AND s.total_amount > 0 THEN COALESCE(s.customer_code, s.customer_name, 'unknown') END) as co_3c`;
const replacement3 = `            COUNT(DISTINCT CASE WHEN LOWER(s.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') AND NOT (LOWER(s.brand_name) = 'vivan' AND LOWER(s.category) IN ('vivan lcd team', 'vivan sparepart', 'screen assembly')) AND s.total_amount > 0 THEN COALESCE(s.customer_code, s.customer_name, 'unknown') END) as co_3c`;

if (content.includes(target1)) content = content.replace(target1, replacement1);
if (content.includes(target2)) content = content.replace(target2, replacement2);
if (content.includes(target3)) content = content.replace(target3, replacement3);

fs.writeFileSync(file, content);
