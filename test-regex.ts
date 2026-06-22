const address = "Jl. Jend. H. Amir Machmud No.571, Karangmekar, Kec. Cimahi Tengah, Kota Cimahi, Jawa Barat 40524";
let district = null;
let city = null;

const kecMatch = address.match(/Kecamatan\s+([^,]+)|Kec\.\s*([^,]+)/i);
if (kecMatch) {
    district = (kecMatch[1] || kecMatch[2]).trim();
}
const kotaMatch = address.match(/Kota\s+([^,]+)|Kabupaten\s+([^,]+)|Kab\.\s*([^,]+)/i);
if (kotaMatch) {
    city = kotaMatch[0].trim();
}
console.log({district, city});
