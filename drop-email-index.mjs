import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';

// Parse .env.local
const envPath = join(process.cwd(), '.env');
const lines = readFileSync(envPath, 'utf8').split('\n');
let uri = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('MONGODB_URI=')) {
    uri = trimmed.slice('MONGODB_URI='.length).replace(/^["']|["']$/g, '');
    break;
  }
}

if (!uri) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to MongoDB…');
await mongoose.connect(uri);
const db = mongoose.connection.db;

try {
  await db.collection('teachers').dropIndex('email_1');
  console.log('✅ Old non-sparse email_1 index dropped successfully!');
  console.log('   Mongoose will recreate it as sparse=true on the next server request.');
} catch (e) {
  if (e.code === 27 || e.codeName === 'IndexNotFound') {
    console.log('ℹ️  Index email_1 not found — it was already dropped or never existed.');
    console.log('   This is fine — Mongoose will create the sparse index automatically.');
  } else {
    console.error('❌ Error dropping index:', e.message);
  }
}

// List current indexes for confirmation
const indexes = await db.collection('teachers').indexes();
console.log('\n📋 Current teachers collection indexes:');
indexes.forEach(idx => {
  const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(', ');
  const flags = [idx.unique && 'unique', idx.sparse && 'sparse'].filter(Boolean).join(', ');
  console.log(`   - ${idx.name} (${keys})${flags ? ` [${flags}]` : ''}`);
});

await mongoose.disconnect();
console.log('\n✅ Done.');
