export async function migrateCredentials(store: any, keytar: any, serviceName: string, accountKeys: Record<string,string>) {
  if (!store) throw new Error('store is required');
  // No-op if keytar not present
  if (!keytar) return { migrated: false };

  const storedCreds = store.get('credentials', {});
  if (!storedCreds || Object.keys(storedCreds).length === 0) return { migrated: false };

  // Migrate each credential key if present
  for (const [accountKey, credName] of Object.entries(accountKeys)) {
    const value = storedCreds[credName];
    if (value) {
      await keytar.setPassword(serviceName, credName, value);
    }
  }

  // Remove legacy plaintext creds
  store.delete('credentials');

  return { migrated: true };
}
