/**
 * Clear all IndexedDB databases
 */
export async function clearAllDatabases(): Promise<void> {
  const dbs = await indexedDB.databases()
  for (const db of dbs) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name)
    }
  }
}

/**
 * Wait for IndexedDB operation to complete
 */
export function waitForIDB<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Count items in an IndexedDB store
 */
export async function countItemsInStore(
  dbName: string,
  storeName: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const countRequest = store.count()

      countRequest.onsuccess = () => {
        db.close()
        resolve(countRequest.result)
      }
      countRequest.onerror = () => {
        db.close()
        reject(countRequest.error)
      }
    }

    request.onerror = () => reject(request.error)
  })
}
