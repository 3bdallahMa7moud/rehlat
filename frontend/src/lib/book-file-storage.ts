const DATABASE_NAME = "journey-of-change-books";
const STORE_NAME = "book-files";
const DATABASE_VERSION = 1;

export interface StoredBookFile {
  taskId: string;
  name: string;
  type: string;
  blob: Blob;
  updatedAt: number;
}

function openBookDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "taskId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("تعذر فتح تخزين الكتب."));
  });
}

export async function saveBookFile(taskId: string, file: File) {
  const database = await openBookDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        taskId,
        name: file.name,
        type: file.type,
        blob: file,
        updatedAt: Date.now(),
      } satisfies StoredBookFile);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("تعذر حفظ ملف الكتاب."));
      transaction.onabort = () => reject(transaction.error ?? new Error("أُلغي حفظ ملف الكتاب."));
    });
  } finally {
    database.close();
  }
}

export async function getBookFile(taskId: string) {
  const database = await openBookDatabase();
  try {
    return await new Promise<StoredBookFile | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(taskId);
      request.onsuccess = () => resolve(request.result as StoredBookFile | undefined);
      request.onerror = () => reject(request.error ?? new Error("تعذر استعادة ملف الكتاب."));
    });
  } finally {
    database.close();
  }
}
