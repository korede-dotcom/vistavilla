'use strict';
const defaults = {
  eyebrow: 'A private address in the heart of Lagos',
  headline: 'The art of feeling at home.',
  introduction: 'Thoughtfully appointed apartments. Unhurried mornings. A quieter kind of luxury, made for the way you stay.',
  heroImage: '/images/background/3.jpg',
  aboutTitle: 'A little more space. A lot more you.',
  aboutText: 'Settle into your own corner of Lagos. From a short city escape to an extended stay, discover considered spaces and a warm welcome at Vistavilla Apartment.',
  aboutImage: '/images/resource/feature-1.png',
  roomsTitle: 'Find your kind of sanctuary.',
  amenities: 'Comfortable living spaces\nThoughtful hospitality\nA central Lagos address\nSpace to unwind',
  phone: '+2349111458637',
  email: 'vistavillaapartment@gmail.com',
  address: '66 Campbell Street, Onikan, Lagos, Nigeria',
  showAbout: true,
  showRooms: true,
  showAmenities: true
};
function validate(input) {
  const result = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    if (typeof fallback === 'boolean') {
      result[key] = input[key] === 'on' || input[key] === true;
      continue;
    }
    if (typeof input[key] !== 'string' || !input[key].trim()) throw new Error(`${key} is required.`);
    const value = input[key].trim();
    if (value.length > (['introduction', 'aboutText', 'amenities'].includes(key) ? 1500 : 300)) throw new Error(`${key} is too long.`);
    if (key.endsWith('Image')) {
      const local = /^\/images\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(value) && !value.includes('..');
      let remote = false;
      try { const url = new URL(value); remote = url.protocol === 'https:' && !url.username && !url.password; } catch (_) {}
      if (!local && !remote) throw new Error('Images must use an HTTPS URL or a local /images/ path.');
    }
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email.');
    if (key === 'phone' && !/^\+?[\d ()-]{7,30}$/.test(value)) throw new Error('Enter a valid phone number.');
    result[key] = value;
  }
  return result;
}
module.exports = { defaults, validate };
